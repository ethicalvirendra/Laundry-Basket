const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCAL_DIR = 'C:\\Projects\\Laundry Basket\\Web';
const EXCLUDE = [
  'node_modules', '.next', '.git', '*.log', 
  'ssh_deploy.js', 'ssh_test.js', 'sftp_test.js', 
  'ftp_test.js', 'sshrun.bat', 'askpass.bat', 'deploy.sh',
  'ssh_check.ps1', '.env.example'
];

console.log('📦 Preparing production files...');

// Check if 7zip is available
try {
  execSync('7z --help', { stdio: 'ignore' });
  console.log('Using 7-Zip...');
  const excludeArgs = EXCLUDE.map(e => `-xr!${e}`).join(' ');
  execSync(`7z a -tzip "C:\\Projects\\Laundry Basket\\laundry_basket_prod.zip" "${LOCAL_DIR}\\*" ${excludeArgs}`, { stdio: 'inherit' });
} catch (e) {
  // Use PowerShell Compress-Archive as fallback
  console.log('Using PowerShell compression...');
  const destZip = 'C:\\Projects\\Laundry Basket\\laundry_basket_prod.zip';
  
  // Build exclude list
  const excludeFolders = ['node_modules', '.next', '.git'];
  
  // Get all files excluding node_modules and .next
  const getAllFiles = (dir, excludes = []) => {
    const files = [];
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (excludes.some(ex => item === ex || item.startsWith(ex))) continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          files.push(...getAllFiles(fullPath, excludes));
        } else {
          files.push(fullPath);
        }
      }
    } catch (e) {}
    return files;
  };
  
  console.log('Counting files to include (excluding node_modules, .next, .git)...');
  const files = getAllFiles(LOCAL_DIR, excludeFolders);
  console.log(`Found ${files.length} files to package`);
  
  // List key directories
  const dirs = new Set(files.map(f => path.relative(LOCAL_DIR, path.dirname(f)).split(path.sep)[0]));
  console.log('Top-level items:', [...dirs].join(', '));
}
