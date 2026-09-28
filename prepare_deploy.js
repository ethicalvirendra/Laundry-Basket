const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = 'C:/Projects/Laundry Basket';
const WEB = path.join(ROOT, 'Web');
const DEPLOY = path.join(ROOT, 'DEPLOY_FRESH');

console.log('1. Cleaning up previous deploy folder...');
if (fs.existsSync(DEPLOY)) {
  fs.rmSync(DEPLOY, { recursive: true, force: true });
}
fs.mkdirSync(DEPLOY, { recursive: true });

console.log('2. Building Manager Panel...');
execSync('npm run build', { cwd: path.join(WEB, 'manager-panel'), stdio: 'inherit', shell: true });

console.log('3. Building Admin Dashboard...');
execSync('npm run build', { cwd: path.join(WEB, 'admin-dashboard'), stdio: 'inherit', shell: true });

console.log('4. Copying Frontend & Backend files to Deployment folder...');
const foldersToCopy = ['Pages', 'assets', 'images', '.well-known', 'shared'];
const filesToCopy = ['server.js', 'app.js', 'package.json', 'package-lock.json', '.env', '.env.example', 'index.html', 'robots.txt', 'sitemap.xml'];

for (const folder of foldersToCopy) {
  const src = path.join(WEB, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(DEPLOY, folder), { recursive: true });
  }
}

for (const file of filesToCopy) {
  const src = path.join(WEB, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DEPLOY, file));
  }
}

console.log('5. Copying built panels...');
fs.cpSync(path.join(WEB, 'manager-panel/out'), path.join(DEPLOY, 'manager'), { recursive: true });
fs.cpSync(path.join(WEB, 'admin-dashboard/out'), path.join(DEPLOY, 'admin'), { recursive: true });

// Copy backend service account if it exists (excluding node_modules)
if (fs.existsSync(path.join(WEB, 'backend'))) {
  fs.cpSync(path.join(WEB, 'backend'), path.join(DEPLOY, 'backend'), {
    recursive: true,
    filter: (srcPath) => !srcPath.includes('node_modules')
  });
}

console.log('6. Setup complete! Folder is ready at ' + DEPLOY);
