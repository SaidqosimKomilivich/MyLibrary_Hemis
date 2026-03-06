const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            let lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('fixed inset-0')) {
                    // Match z-50, z-100, z-200, z-300
                    const m = lines[i].match(/z-([0-9]+)/);
                    if (m && m[1] !== '0' && m[1] !== '9999' && !lines[i].includes('hidden fixed inset-0')) {
                        lines[i] = lines[i].replace(/z-[0-9]+/, 'z-[999]');
                        modified = true;
                    }
                }
            }
            if (modified) {
                fs.writeFileSync(fullPath, lines.join('\n'));
                console.log('Updated', fullPath);
            }
        }
    });
}
processDir('./src');
