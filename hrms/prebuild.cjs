const fs = require('fs');
const path = require('path');
console.log('Running hrms pre-build tasks...');
const srcCss = path.join(__dirname, 'src/index.css');
const destCss = path.join(__dirname, 'app/globals.css');
if (fs.existsSync(srcCss)) {
  fs.mkdirSync(path.dirname(destCss), { recursive: true });
  fs.copyFileSync(srcCss, destCss);
  console.log('✓ globals.css copied.');
}
