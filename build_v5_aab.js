const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = 'C:\\Projects\\Laundry Basket\\App';
const rootDir = 'C:\\Projects\\Laundry Basket';
const artifactDir = 'C:\\Users\\viren\\.gemini\\antigravity\\brain\\805a7168-1b41-4509-9afe-4c39073c5cfc';

const env = { ...process.env };
env.GRADLE_USER_HOME = 'C:\\Projects\\Laundry Basket\\.gradle_fresh';
env.PATH = `C:\\Windows\\System32\\WindowsPowerShell\\v1.0;C:\\Windows\\System32;C:\\Windows;C:\\flutter\\bin;${process.env.PATH || ''}`;

console.log('🚀 Running Unified Marketplace Flutter AppBundle (AAB) Build Script...');

// Run flutter clean first to remove locked build artifacts
const clean = spawn('cmd.exe', ['/c', 'flutter', 'clean'], { cwd: appDir, env, stdio: 'inherit' });

clean.on('close', (cleanCode) => {
    console.log(`Clean process exited with code ${cleanCode}. Starting release appbundle build...`);
    const build = spawn('cmd.exe', ['/c', 'flutter', 'build', 'appbundle', '--release'], {
        cwd: appDir,
        env,
        stdio: 'inherit'
    });

    build.on('close', (code) => {
        console.log(`Build process exited with code ${code}`);
        if (code === 0) {
            const srcAab = path.join(appDir, 'build', 'app', 'outputs', 'bundle', 'release', 'app-release.aab');
            const destAabRoot = path.join(rootDir, 'LaundryBasket_Marketplace_v6.0.0.aab');
            const destAabFinal = path.join(rootDir, 'FINAL_BUILDS', 'LaundryBasket_Marketplace_v6.0.0.aab');
            const destAabArtifact = path.join(artifactDir, 'LaundryBasket_Marketplace_v6.0.0.aab');

            if (fs.existsSync(srcAab)) {
                const stats = fs.statSync(srcAab);
                console.log(`✅ SUCCESS! Output AAB size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                fs.copyFileSync(srcAab, destAabRoot);
                fs.copyFileSync(srcAab, destAabFinal);
                fs.copyFileSync(srcAab, destAabArtifact);
                console.log(`📦 Copied to ${destAabRoot}`);
                console.log(`📦 Copied to ${destAabFinal}`);
                console.log(`📦 Copied to ${destAabArtifact}`);
            } else {
                console.error(`❌ AAB file not found at expected path: ${srcAab}`);
            }
        } else {
            console.error(`❌ Flutter appbundle build failed with exit code ${code}`);
        }
    });
});

