const fs = require('fs');
const path = require('path');

function search(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            if (f !== 'node_modules' && f !== '.next' && f !== '.git') search(p);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.html')) {
            const c = fs.readFileSync(p, 'utf8').toLowerCase();
            if (c.includes('delivery charges') && c.includes('paid to 3rd party rider')) {
                console.log('Match delivery charges & 3rd party in:', p);
            }
            if (c.includes('calculation mode')) {
                console.log('Match calculation mode in:', p);
            }
        }
    });
}

search('Web');
search('DEPLOY_FRESH');
