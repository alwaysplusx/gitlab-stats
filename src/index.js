const { getProjectInfo, getProjectCommits, getCommitDetails, getCommitDiff, isFrontendProject } = require('./apis/gitlab');
const { limitedbatchInsertStatsRecords } = require('./apis/lark');
const { isPathIgnored } = require('./utils/diff');

// 获取年月（格式：yyyyMM）
function getMonthYear(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
}

function getYearStartAndEnd(year) {
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year}-12-31T23:59:59Z`);
    return { since: start, until: end };
}

function parseArgs() {
    const args = process.argv.slice(2);
    const params = {};
    args.forEach(arg => {
        const [key, value] = arg.split('=');
        params[key] = value;
    });
    return params;
}

function validateArgs(params) {
    const requiredParams = ['projectIds'];
    const missingParams = requiredParams.filter(param => !params[param]);

    if (missingParams.length > 0) {
        console.error(`Error: Missing required parameters: ${missingParams.join(', ')}`);
        console.log('Usage: node src/index.js projectIds=<projectId(s)> [-y=<year>]');
        console.log('  - projectIds: Required. GitLab project ID(s).');
        console.log('  - year: Optional. Year for statistics (default is the current year).');
        process.exit(1);
    }
}

async function writeToBitable(statsRecords) {
    const BATCH_SIZE = 1000;
    for (let i = 0; i < statsRecords.length; i += BATCH_SIZE) {
        const batch = statsRecords.slice(i, i + BATCH_SIZE);
        await limitedbatchInsertStatsRecords(batch);
    }
    console.log('Successfully wrote all stats to Bitable');
}

/**
 * 获取提交的代码变更统计信息
 * @param {Object} project 项目信息
 * @param {string} commitSha 提交的SHA值
 * @returns {Promise<Object>} 返回包含additions和deletions的对象
 */
async function getCommentStatsByDiff(project, commitSha) {
    const diffs = await getCommitDiff(project.id, commitSha);
    if (!diffs) return { additions: 0, deletions: 0 };

    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const diff of diffs) {
        if (isPathIgnored(diff.new_path) || isPathIgnored(diff.old_path)) {
            continue
        }
        // 解析diff内容计算增删行数
        const lines = diff.diff.split('\n');
        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                totalAdditions++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                totalDeletions++;
            }
        }
    }
    return {
        additions: totalAdditions,
        deletions: totalDeletions
    };
}

/**
 * 获取提交的代码变更统计信息
 * @param {Object} project 项目信息
 * @param {string} commitSha 提交的SHA值
 * @returns {Promise<Object>} 返回包含additions和deletions的对象
 */
async function getCommentStatsByDetail(project, commitSha) {
    const commitDetails = await getCommitDetails(project.id, commitSha);
    if (!commitDetails) return { additions: 0, deletions: 0 };

    return {
        additions: commitDetails.stats.additions || 0,
        deletions: commitDetails.stats.deletions || 0
    };
}

async function executeStats(project, since, until) {
    const commits = await getProjectCommits(project.id, since, until);
    if (commits.length === 0) {
        console.log(`No commits found for project: ${project.name}`);
        return;
    }

    const frontend = isFrontendProject(project)
    const getCommitStats = frontend ? getCommentStatsByDiff : getCommentStatsByDetail;

    const stats = {};
    for (const commit of commits) {
        const user = commit.author_email;
        const commitSha = commit.id;
        const commitDate = commit.created_at;  // 提交日期
        const commitMonthYear = getMonthYear(commitDate);  // 获取年月

        const commitDetails = await getCommitStats(project, commitSha)

        if (!commitDetails) continue;

        const additions = commitDetails.additions || 0;
        const deletions = commitDetails.deletions || 0;

        if (!stats[user]) {
            stats[user] = {};
        }

        // 如果该用户没有该年月的统计数据，初始化一个空对象
        if (!stats[user][commitMonthYear]) {
            stats[user][commitMonthYear] = { commits: 0, additions: 0, deletions: 0, netChanges: 0 };
        }

        // 更新该用户在该年月的统计数据
        stats[user][commitMonthYear].commits++;
        stats[user][commitMonthYear].additions += additions;
        stats[user][commitMonthYear].deletions += deletions;
        stats[user][commitMonthYear].netChanges += (additions - deletions);
    }
    return stats;
}

async function executeStatsByProjectId(projectId, since, until) {
    const project = await getProjectInfo(projectId)
    if (!project) {
        console.log("Project info not found for project ID:", projectId);
        return;
    }

    console.log('Starting stats collection for:');
    console.log(`Project ID: ${projectId}`);
    console.log(`Project: ${project.name}`);
    console.log(`Commit period: ${since.toISOString()} - ${until.toISOString()}`);

    const allStats = await executeStats(project, since, until)
    if (!allStats) {
        console.log("No stats found for project ID:", projectId);
        return;
    }

    const statsRecords = Object.entries(allStats).map(([user, userStats]) => {
        return Object.entries(userStats).map(([yearMonth, stats]) => {
            return {
                projectId,
                projectName: project.name,
                author: user,
                commits: stats.commits,
                additions: stats.additions,
                deletions: stats.deletions,
                yearMonth: yearMonth
            }
        })
    }).flat()

    console.log('Stats records size: ', statsRecords.length);
    await writeToBitable(statsRecords)
}

async function main() {
    const params = parseArgs();
    validateArgs(params);

    const projectIds = params.projectIds.split(',');
    const year = params.year || new Date().getFullYear();
    const { since, until } = getYearStartAndEnd(year);

    console.log('Processing projects:', projectIds);
    for (const projectId of projectIds) {
        await executeStatsByProjectId(projectId, since, until);
    }
}

main();
