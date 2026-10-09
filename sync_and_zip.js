const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Step 1: Syncing Web/manager-panel/out to DEPLOY_FRESH/manager ---');
const src = path.join(__dirname, 'Web', 'manager-panel', 'out');
const dest = path.join(__dirname, 'DEPLOY_FRESH', 'manager');

if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log('Synced manager out to DEPLOY_FRESH/manager successfully.');
} else {
    console.error('Source directory does not exist:', src);
    process.exit(1);
}

// Sync Web/server.js to DEPLOY_FRESH/server.js
const serverSrc = path.join(__dirname, 'Web', 'server.js');
const serverDest = path.join(__dirname, 'DEPLOY_FRESH', 'server.js');
if (fs.existsSync(serverSrc)) {
    fs.copyFileSync(serverSrc, serverDest);
    console.log('Synced Web/server.js to DEPLOY_FRESH/server.js');
}

// Sync Web/.well-known to DEPLOY_FRESH/.well-known
const wkSrc = path.join(__dirname, 'Web', '.well-known');
const wkDest = path.join(__dirname, 'DEPLOY_FRESH', '.well-known');
if (fs.existsSync(wkSrc)) {
    fs.cpSync(wkSrc, wkDest, { recursive: true });
    console.log('Synced Web/.well-known to DEPLOY_FRESH/.well-known');
}

console.log('\n--- Step 2: Regenerating deployment zips ---');
if (fs.existsSync(path.join(__dirname, 'zip_deploy.js'))) {
    execSync('node zip_deploy.js', { stdio: 'inherit' });
} else {
    console.log('zip_deploy.js not found, checking alternatives...');
}

console.log('\n--- Step 3: Copying DEPLOYMENT_FINAL.zip to artifact dir ---');
const artifactDir = 'C:\\Users\\viren\\.gemini\\antigravity\\brain\\805a7168-1b41-4509-9afe-4c39073c5cfc';
const zipSrc = path.join(__dirname, 'DEPLOYMENT_FINAL.zip');
if (fs.existsSync(zipSrc) && fs.existsSync(artifactDir)) {
    fs.copyFileSync(zipSrc, path.join(artifactDir, 'DEPLOYMENT_FINAL.zip'));
    console.log('Copied DEPLOYMENT_FINAL.zip to artifact directory.');
}

console.log('\nAll sync & zip steps completed!');
