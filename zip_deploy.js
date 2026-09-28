const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const ROOT = 'C:/Projects/Laundry Basket';
const DEPLOY = path.join(ROOT, 'DEPLOY_FRESH');
const FINAL_DIR = path.join(ROOT, 'FINAL_BUILDS');

const TARGETS = [
  path.join(FINAL_DIR, 'laundry_deploy_v5.0.0.zip'),
  path.join(FINAL_DIR, 'DEPLOYMENT_FINAL.zip'),
  path.join(FINAL_DIR, 'DEPLOYMENT_v5.0.0.zip'),
  path.join(ROOT, 'DEPLOYMENT_FINAL.zip')
];

console.log('📦 Creating Linux/Hostinger compatible ZIP using archiver with POSIX forward slashes...');

if (!fs.existsSync(DEPLOY)) {
  console.error('🛑 DEPLOY_FRESH folder does not exist!');
  process.exit(1);
}

const primaryZip = TARGETS[0];
if (fs.existsSync(primaryZip)) {
  fs.unlinkSync(primaryZip);
}

const output = fs.createWriteStream(primaryZip);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  const sizeMb = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✅ Primary zip created: ${primaryZip} (${sizeMb} MB)`);
  
  // Mirror to the other paths so user finds it regardless of which path/name they open
  for (let i = 1; i < TARGETS.length; i++) {
    fs.copyFileSync(primaryZip, TARGETS[i]);
    console.log(`✅ Mirrored to: ${TARGETS[i]}`);
  }
  console.log('\n🎉 All deployment zip packages are 100% updated with Linux POSIX forward-slash paths!');
});

archive.on('error', (err) => {
  console.error('🛑 Archive error:', err);
  process.exit(1);
});

archive.pipe(output);

// Recursively add all files in DEPLOY_FRESH with POSIX forward slashes
archive.directory(DEPLOY, false);

archive.finalize();
