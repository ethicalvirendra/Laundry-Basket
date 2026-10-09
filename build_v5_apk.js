const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = 'C:\\Projects\\Laundry Basket\\App';
const rootDir = 'C:\\Projects\\Laundry Basket';
const artifactDir = 'C:\\Users\\viren\\.gemini\\antigravity\\brain\\805a7168-1b41-4509-9afe-4c39073c5cfc';

const env = { ...process.env };
env.GRADLE_USER_HOME = 'C:\\Projects\\Laundry Basket\\.gradle_fresh';
env.PATH = `C:\\Windows\\System32\\WindowsPowerShell\\v1.0;C:\\Windows\\System32;C:\\Windows;C:\\flutter\\bin;${process.env.PATH || ''}`;

console.log('🚀 Running Unified Marketplace Flutter Build Script (APK)...');

// Run flutter clean first to remove locked build artifacts
const clean = spawn('cmd.exe', ['/c', 'flutter', 'clean'], { cwd: appDir, env, stdio: 'inherit' });

clean.on('close', (cleanCode) => {
    console.log(`Clean process exited with code ${cleanCode}. Starting release build...`);
    const build = spawn('cmd.exe', ['/c', 'flutter', 'build', 'apk', '--release'], {
        cwd: appDir,
        env,
        stdio: 'inherit'
    });

    build.on('close', (code) => {
        console.log(`Build process exited with code ${code}`);
        if (code === 0) {
            const srcApk = path.join(appDir, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
            const destApkRoot = path.join(rootDir, 'LaundryBasket_Marketplace_v6.0.0.apk');
            const destApkFinal = path.join(rootDir, 'FINAL_BUILDS', 'LaundryBasket_Marketplace_v6.0.0.apk');
            const destApkArtifact = path.join(artifactDir, 'LaundryBasket_Marketplace_v6.0.0.apk');

            if (fs.existsSync(srcApk)) {
                const stats = fs.statSync(srcApk);
                console.log(`✅ SUCCESS! Output APK size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                fs.copyFileSync(srcApk, destApkRoot);
                fs.copyFileSync(srcApk, destApkFinal);
                fs.copyFileSync(srcApk, destApkArtifact);
                console.log(`📦 Copied to ${destApkRoot}`);
                console.log(`📦 Copied to ${destApkFinal}`);
                console.log(`📦 Copied to ${destApkArtifact}`);
            } else {
                console.error(`❌ APK file not found at expected path: ${srcApk}`);
            }
        } else {
            console.error(`❌ Flutter build failed with exit code ${code}`);
        }
    });
});
