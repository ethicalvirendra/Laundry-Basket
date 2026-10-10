const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            searchFiles(full);
        } else if (full.endsWith('.dart') || full.endsWith('.js') || full.endsWith('.tsx')) {
            const txt = fs.readFileSync(full, 'utf8');
            if (txt.toLowerCase().includes('gst') || txt.includes('* 1.05') || txt.includes('* 1.18') || txt.includes('* 0.05')) {
                console.log('Found in', full);
            }
        }
    }
}

searchFiles('c:/Projects/Laundry Basket/App/lib');
searchFiles('c:/Projects/Laundry Basket/Web/manager-panel/src');
