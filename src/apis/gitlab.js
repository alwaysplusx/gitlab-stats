const axios = require('axios');

const GITLAB_SESSION = process.env.GITLAB_SESSION
const GITLAB_URL = process.env.GITLAB_URL

// Define headers for all requests
const HEADERS = {
    'Cookie': `_gitlab_session=${GITLAB_SESSION}`
};

async function fetchJSON(url) {
    try {
        const response = await axios.get(url, {
            headers: HEADERS,
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching: ${url}`, error.message);
        return null;
    }
}

async function getProjectInfo(projectId) {
    const url = `${GITLAB_URL}/api/v4/projects/${projectId}`;
    return await fetchJSON(url);
}

async function getProjectCommits(projectId, since, until) {
    const commits = [];
    let page = 1;
    let data;
    do {
        const url = `${GITLAB_URL}/api/v4/projects/${projectId}/repository/commits?since=${since.toISOString()}&per_page=100&page=${page}&unit=${until.toISOString()}`;
        data = await fetchJSON(url);
        if (data) commits.push(...data);
        page++;
    } while (data && data.length > 0);
    return commits;
}

async function getCommitDetails(projectId, commitSha) {
    const url = `${GITLAB_URL}/api/v4/projects/${projectId}/repository/commits/${commitSha}`;
    return await fetchJSON(url);
}

/**
 * 获取指定提交的 diff 内容
 * @param {string} projectId GitLab 项目 ID
 * @param {string} commitSha 提交的 SHA 值
 * @returns {Promise<Array<Object>>} 包含 diff 信息的数组，每个对象包含文件路径和 diff 文本
 */
async function getCommitDiff(projectId, commitSha) {
    const url = `${GITLAB_URL}/api/v4/projects/${projectId}/repository/commits/${commitSha}/diff`;
    return await fetchJSON(url);
}
/**
 * 判断项目是否为前端项目
 * @param {Object} project GitLab项目信息对象
 * @returns {Promise<boolean>} 是否为前端项目
 */
async function isFrontendProject(project) {
    // 检查项目根目录下是否存在前端项目特征文件
    const frontendFiles = [
        'package.json',
        'webpack.config.js', 
        'vite.config.js',
        'next.config.js',
        'nuxt.config.js',
        'angular.json'
    ];

    // 检查特征文件是否存在
    const url = `${GITLAB_URL}/api/v4/projects/${project.id}/repository/tree`;
    const files = await fetchJSON(url);
    if (!files) return false;

    const fileNames = files.map(f => f.name);
    return frontendFiles.some(file => fileNames.includes(file));
}

module.exports = {
    getProjectInfo,
    getProjectCommits,
    getCommitDetails,
    getCommitDiff,
    isFrontendProject
};