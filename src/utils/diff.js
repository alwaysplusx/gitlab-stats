
// 前端项目常见的需要忽略的文件路径
const defaultIgnoreFilePaths = [
  // 包管理器锁文件
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'package.json',
  '.npmrc',

  'build/',

  // 构建配置文件
  'webpack.config.js',
  'vite.config.js',
  'rollup.config.js',
  'babel.config.js',
  'tsconfig.json',

  // 依赖目录
  '/node_modules/',

  // 测试文件
  '.test.js',
  '.spec.js',
  '.test.ts',
  '.spec.ts',

  // 静态资源
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',

  // 其他配置文件
  '.eslintrc',
  '.prettierrc',
  '.editorconfig',
  '.gitignore',
  'postcss.config.js',
  'tailwind.config.js'
];

/**
 * 判断文件路径是否在忽略列表中
 * @param {string} filePath 需要检查的文件路径
 * @param {Array<string>} ignorePaths 忽略路径列表
 * @returns {boolean} 如果文件路径需要被忽略返回 true，否则返回 false
 */
function isPathIgnored(filePath, ignorePaths = defaultIgnoreFilePaths) {
  if (ignorePaths.includes(filePath)) {
    return true;
  }
  return ignorePaths.some(ignorePath => {
    return filePath.startsWith(ignorePath);
  });
}

/**
 * 计算 diff 文本中的新增行数和删除行数
 * @param {string} diffText diff 格式的文本
 * @returns {{additions: number, deletions: number}} 包含新增和删除行数的对象
 */
function calculateDiffStats(diffText) {
  if (!diffText) {
    return { additions: 0, deletions: 0 };
  }

  const lines = diffText.split('\n');
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }

  return { additions, deletions };
}

/**
 * 批量计算多个 commit diff 的统计数据，支持忽略指定路径
 * @param {Array<Object>} diffs commit diff 数据数组，每个对象包含 diff 文本和文件路径
 * @param {Array<string>} ignorePaths 需要忽略的文件路径数组，支持通配符
 * @returns {{additions: number, deletions: number}} 包含新增和删除行数的对象
 */
function calculateBatchDiffStats(diffs, ignorePaths = []) {
  let totalAdditions = 0;
  let totalDeletions = 0;

  // 将通配符路径转换为正则表达式
  const ignorePatterns = ignorePaths.map(path => {
    return new RegExp('^' + path.replace(/\*/g, '.*') + '$');
  });

  for (const diff of diffs) {
    // 检查文件路径是否需要被忽略
    const shouldIgnore = ignorePatterns.some(pattern =>
      pattern.test(diff.new_path) || pattern.test(diff.old_path)
    );

    if (!shouldIgnore) {
      const { additions, deletions } = calculateDiffStats(diff.diff);
      totalAdditions += additions;
      totalDeletions += deletions;
    }
  }

  return {
    additions: totalAdditions,
    deletions: totalDeletions
  };
}

module.exports = {
  calculateDiffStats, calculateBatchDiffStats, isPathIgnored
};
