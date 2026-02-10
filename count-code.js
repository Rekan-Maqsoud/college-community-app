const fs = require('fs');
const path = require('path');

const excludeDirs = ['node_modules', '.git', '.expo', 'android', 'ios', 'build', 'dist'];

const countLines = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').length;
};

const scanDirectory = (dirPath, stats) => {
  const items = fs.readdirSync(dirPath);

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        scanDirectory(fullPath, stats);
      }
      return;
    }

    if (!stat.isFile()) {
      return;
    }

    const ext = path.extname(item).toLowerCase();
    if (ext === '.js' || ext === '.jsx') {
      const lines = countLines(fullPath);
      const type = ext.slice(1);

      stats.fileTypes[type].count += 1;
      stats.fileTypes[type].lines += lines;
      stats.totalFiles += 1;
      stats.totalLines += lines;
    }
  });
};

const getCodeStats = (projectRoot = __dirname) => {
  const stats = {
    totalFiles: 0,
    totalLines: 0,
    fileTypes: {
      js: { count: 0, lines: 0 },
      jsx: { count: 0, lines: 0 },
    },
  };

  scanDirectory(projectRoot, stats);
  return stats;
};

module.exports = { getCodeStats };

if (require.main === module) {
  const stats = getCodeStats();
  console.log('Code Statistics:');
  console.log(`Total files: ${stats.totalFiles}`);
  console.log(`Total lines: ${stats.totalLines}`);
  Object.entries(stats.fileTypes).forEach(([type, info]) => {
    console.log(`${type.toUpperCase()} files: ${info.count}, lines: ${info.lines}`);
  });
}
