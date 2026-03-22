const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('moderateScale')) {
                const lines = content.split('\n');
                const hasImport = lines.some(l => l.includes('import') && l.includes('moderateScale'));
                if (!hasImport) {
                    console.log('Missing import in: ' + filePath);
                }
            }
        }
    });
    return results;
}
walk('app');
