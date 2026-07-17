const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/#0D1425/g, '#FFFFFF');
    content = content.replace(/#F1F5F9/g, '#111827');
    content = content.replace(/#94A3B8/g, '#6B7280');
    content = content.replace(/rgba\(255,255,255,0\.1\)/g, 'rgba(0,0,0,0.1)');
    content = content.replace(/rgba\(255,255,255,0\.04\)/g, 'rgba(0,0,0,0.06)');
    content = content.replace(/rgba\(255,255,255,0\.06\)/g, 'rgba(0,0,0,0.08)');
    content = content.replace(/rgba\(255,255,255,0\.05\)/g, 'rgba(0,0,0,0.05)');
    content = content.replace(/fill="white"/g, 'fill="#111827"');
    fs.writeFileSync(filePath, content, 'utf8');
}

function walk(dir) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath);
        } else if (filePath.endsWith('.jsx')) {
            replaceInFile(filePath);
        }
    }
}

walk(path.join(__dirname, 'src'));
console.log('Done!');
