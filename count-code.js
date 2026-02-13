const fs = require('fs');
const path = require('path');

// Exclude clutter
const excludeDirs = ['node_modules', '.git', '.expo', 'android', 'ios', 'build', 'dist', '.idea', '.vscode', 'coverage'];
// Only count actual code (Human/AI written) - NO JSON
const targetExts = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html', '.vue'];

// Helper to pretty print numbers (e.g. 1,234)
const formatNum = (num) => new Intl.NumberFormat('en-US').format(num);

const countLines = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Filter out empty lines for accurate "written" count
    return content.split('\n').filter(line => line.trim() !== '').length;
  } catch (e) {
    return 0;
  }
};

const scanDirectory = (dirPath, stats) => {
  let items;
  try {
    items = fs.readdirSync(dirPath);
  } catch (e) {
    return; // Skip if permission denied
  }

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    let stat;
    try { stat = fs.statSync(fullPath); } catch (e) { return; }

    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        // Log progress for directories
        console.log(`📂 Scanning: ${item}/`);
        scanDirectory(fullPath, stats);
      }
      return;
    }

    if (!stat.isFile()) return;

    const ext = path.extname(item).toLowerCase();
    
    if (targetExts.includes(ext)) {
      const lines = countLines(fullPath);
      const type = ext.slice(1); // e.g., 'js'

      // Initialize type stats if new
      if (!stats.fileTypes[type]) {
        stats.fileTypes[type] = { count: 0, lines: 0 };
      }

      // Update aggregate stats
      stats.fileTypes[type].count += 1;
      stats.fileTypes[type].lines += lines;
      stats.totalFiles += 1;
      stats.totalLines += lines;

      // Track individual file for leaderboard
      stats.allFiles.push({
        name: item,
        path: fullPath,
        lines: lines,
        type: type
      });
      
      // Log individual file (optional, comment out if too noisy)
      // console.log(`   └─ ${item} (${lines})`);
    }
  });
};

const getCodeStats = (projectRoot = __dirname) => {
  console.log('\n🚀 Starting Codebase Scan...\n');
  
  const stats = {
    totalFiles: 0,
    totalLines: 0,
    fileTypes: {},
    allFiles: [] // Store all to sort later
  };

  scanDirectory(projectRoot, stats);
  return stats;
};

// --- RUNNER ---
if (require.main === module) {
  const stats = getCodeStats();
  
  // Sort files by line count (descending)
  const sortedFiles = stats.allFiles.sort((a, b) => b.lines - a.lines);
  const top5 = sortedFiles.slice(0, 5);

  console.log('\n' + '━'.repeat(50));
  console.log('📊  PROJECT Line CHECK ');
  console.log('━'.repeat(50));
  console.log(`📁  Total Files:   ${formatNum(stats.totalFiles)}`);
  console.log(`📝  Total Lines:   ${formatNum(stats.totalLines)}`);
  console.log(`📏  Avg Lines/File: ${Math.round(stats.totalLines / (stats.totalFiles || 1))}`);
  console.log('━'.repeat(50));

  console.log('\n🏆  TOP 5 CHONKIEST FILES');
  top5.forEach((file, index) => {
    const rank = index + 1;
    // Shorten path for display
    const shortPath = file.path.replace(__dirname, '').replace(/^[\\\/]/, ''); 
    console.log(`${rank}. ${file.name.padEnd(25)} │ ${formatNum(file.lines).padStart(6)} lines │ 📂 .../${path.dirname(shortPath).split(path.sep).pop()}`);
  });

  console.log('\n📈  BREAKDOWN BY TYPE');
  // Convert to array for table display and sort by lines
  const tableData = Object.entries(stats.fileTypes)
    .sort(([, a], [, b]) => b.lines - a.lines)
    .reduce((acc, [type, data]) => {
      acc[type] = { 
        Files: formatNum(data.count), 
        Lines: formatNum(data.lines) 
      };
      return acc;
    }, {});
    
  console.table(tableData);
  console.log('\n');
}

module.exports = { getCodeStats };