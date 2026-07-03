const cp = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- Custom Hostinger Build Wrapper ---');

try {
  console.log('Step 1: Installing dependencies in hrms...');
  cp.execSync('npm install', { cwd: path.join(__dirname, 'hrms'), stdio: 'inherit' });

  console.log('Step 2: Building hrms application...');
  cp.execSync('npm run build', { cwd: path.join(__dirname, 'hrms'), stdio: 'inherit' });

  console.log('Step 3: Copying dist files to target output folder (.next)...');
  const distPath = path.join(__dirname, 'hrms', 'dist');
  const nextPath = path.join(__dirname, '.next');

  // Recreate .next folder
  if (fs.existsSync(nextPath)) {
    fs.rmSync(nextPath, { recursive: true, force: true });
  }
  fs.mkdirSync(nextPath, { recursive: true });

  // Helper to copy directory recursively
  function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
      fs.mkdirSync(to);
    }
    fs.readdirSync(from).forEach(element => {
      if (fs.lstatSync(path.join(from, element)).isDirectory()) {
        copyFolderSync(path.join(from, element), path.join(to, element));
      } else {
        fs.copyFileSync(path.join(from, element), path.join(to, element));
      }
    });
  }

  copyFolderSync(distPath, nextPath);
  console.log('✓ Successfully copied files to .next folder!');
  console.log('--- Build Wrapper Finished Successfully ---');

} catch (err) {
  console.error('🛑 Build wrapper failed:', err.message);
  process.exit(1);
}
