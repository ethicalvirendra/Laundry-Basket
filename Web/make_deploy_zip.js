const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const BASE = 'C:/Projects/Laundry Basket/Web';
const OUT = 'C:/Projects/Laundry Basket/laundry_deploy_v6.0.0.zip';

const ENV = `MONGODB_URI=mongodb://laundrybasketbpl_db_user:Loundry9985@ac-0hvxiiy-shard-00-00.dw5aoia.mongodb.net:27017,ac-0hvxiiy-shard-00-01.dw5aoia.mongodb.net:27017,ac-0hvxiiy-shard-00-02.dw5aoia.mongodb.net:27017/laundry_basket?ssl=true&authSource=admin&retryWrites=true&w=majority
PORT=5000
JWT_SECRET=laundry_basket_secret_key_2025
ADMIN_USER=admin
ADMIN_PASS=Admin_9985
MSG91_AUTH_KEY=499291A8wjqZYMS69c26d71P1
MSG91_TEMPLATE_ID=69c26e125a599fdfa30c8e73
NODE_ENV=production
`;

async function main() {
  if (fs.existsSync(OUT)) fs.unlinkSync(OUT);

  const output = fs.createWriteStream(OUT);
  const archive = new ZipArchive({ zlib: { level: 6 } });

  output.on('close', () => {
    const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅ Deploy ZIP v6.0.0 created!`);
    console.log(`📦 Size: ${mb} MB`);
    console.log(`📍 ${OUT.replace(/\//g, '\\')}`);
    console.log(`\n👉 Upload this ZIP in Hostinger → Deployments`);
  });

  archive.on('error', e => { throw e; });
  archive.pipe(output);

  // Temp .env
  const tmpEnv = path.join(BASE, '.env.tmp');
  fs.writeFileSync(tmpEnv, ENV);

  console.log('📦 Building deploy ZIP v6.0.0...\n');

  // === BACKEND ===
  console.log('🔧 Backend:');
  const backendFiles = ['server.js', 'package.json', 'serviceAccountKey.json', 'robots.txt', 'sitemap.xml'];
  for (const f of backendFiles) {
    const fp = path.join(BASE, f);
    if (fs.existsSync(fp)) {
      archive.file(fp, { name: f });
      console.log(`  ✓ ${f}`);
    }
  }

  archive.file(tmpEnv, { name: '.env' });
  console.log('  ✓ .env (production)');

  const backendKey = path.join(BASE, 'backend', 'serviceAccountKey.json');
  if (fs.existsSync(backendKey)) {
    archive.file(backendKey, { name: 'backend/serviceAccountKey.json' });
    console.log('  ✓ backend/serviceAccountKey.json');
  }

  // === WEBSITE ===
  console.log('\n🌐 Website:');
  archive.file(path.join(BASE, 'index.html'), { name: 'index.html' });
  console.log('  ✓ index.html');

  const webDirs = ['Pages', 'assets', 'images', '.well-known'];
  for (const d of webDirs) {
    const dp = path.join(BASE, d);
    if (fs.existsSync(dp)) {
      archive.directory(dp, d);
      console.log(`  ✓ ${d}/`);
    }
  }

  // === SHARED ===
  const sharedDir = path.join(BASE, 'shared');
  if (fs.existsSync(sharedDir)) {
    archive.directory(sharedDir, 'shared');
    console.log('  ✓ shared/');
  }

  // === ADMIN DASHBOARD (static export) ===
  const adminOut = path.join(BASE, 'admin-dashboard', 'out');
  if (fs.existsSync(adminOut)) {
    console.log('\n🔐 Admin Dashboard:');
    archive.directory(adminOut, 'admin-dashboard/out');
    console.log('  ✓ admin-dashboard/out/');
  }

  // === MANAGER PANEL (static export) ===
  const managerOut = path.join(BASE, 'manager-panel', 'out');
  if (fs.existsSync(managerOut)) {
    console.log('\n👔 Manager Panel:');
    archive.directory(managerOut, 'manager-panel/out');
    console.log('  ✓ manager-panel/out/');
  }

  await archive.finalize();
  fs.unlinkSync(tmpEnv);
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
