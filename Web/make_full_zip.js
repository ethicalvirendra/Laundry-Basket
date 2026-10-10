const fs = require('fs');
const path = require('path');
const archiverLib = require('archiver');
const { execSync } = require('child_process');

const BASE = 'C:/Projects/Laundry Basket/Web';
const OUT = 'C:/Projects/Laundry Basket/laundry_deploy_v3.0.zip';

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
  console.log('🔨 Building Admin Dashboard...');
  execSync('npm run build', { cwd: path.join(BASE, 'admin-dashboard'), stdio: 'inherit' });

  console.log('🔨 Building Manager Panel...');
  execSync('npm run build', { cwd: path.join(BASE, 'manager-panel'), stdio: 'inherit' });

  if (fs.existsSync(OUT)) fs.unlinkSync(OUT);

  const output = fs.createWriteStream(OUT);
  const archive = new archiverLib.ZipArchive({ zlib: { level: 6 } });

  output.on('close', () => {
    const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
    const winPath = OUT.replace(/\//g, '\\\\');
    console.log(`\n✅ ZIP DONE! Size: ${mb} MB`);
    console.log(`📍 ${winPath}`);
  });

  archive.on('error', e => { throw e; });
  archive.pipe(output);

  // Write temp .env
  const tmpEnv = path.join(BASE, '.env.tmp');
  fs.writeFileSync(tmpEnv, ENV);

  console.log('Building ZIP...\n');

  // === BACKEND (Node.js server) ===
  console.log('📦 Backend:');
  const backendFiles = ['server.js', 'package.json', 'serviceAccountKey.json', 'robots.txt', 'sitemap.xml'];
  for (const f of backendFiles) {
    const fp = path.join(BASE, f);
    if (fs.existsSync(fp)) {
      archive.file(fp, { name: f });
      console.log(`  ✓ ${f}`);
    }
  }

  // .env with production values
  archive.file(tmpEnv, { name: '.env' });
  console.log('  ✓ .env (production credentials)');

  // backend/serviceAccountKey.json (server.js reads from ./backend/serviceAccountKey.json)
  const backendKey = path.join(BASE, 'backend', 'serviceAccountKey.json');
  if (fs.existsSync(backendKey)) {
    archive.file(backendKey, { name: 'backend/serviceAccountKey.json' });
    console.log('  ✓ backend/serviceAccountKey.json');
  }

  // === WEBSITE (HTML pages) ===
  console.log('\n🌐 Website:');
  const webDirs = ['Pages', 'assets', 'images', '.well-known'];
  for (const d of webDirs) {
    const dp = path.join(BASE, d);
    if (fs.existsSync(dp)) {
      archive.directory(dp, d);
      console.log(`  ✓ ${d}/`);
    }
  }
  archive.file(path.join(BASE, 'index.html'), { name: 'index.html' });
  console.log('  ✓ index.html');

  // === ADMIN DASHBOARD (Next.js static export) ===
  console.log('\n🔐 Admin Dashboard:');
  const adminOut = path.join(BASE, 'admin-dashboard', 'out');
  archive.directory(adminOut, 'admin-dashboard/out');
  console.log('  ✓ admin-dashboard/out/ (full build)');

  // === MANAGER PANEL (Next.js static export) ===
  console.log('\n👔 Manager Panel:');
  const managerOut = path.join(BASE, 'manager-panel', 'out');
  archive.directory(managerOut, 'manager-panel/out');
  console.log('  ✓ manager-panel/out/ (full build)');

  await archive.finalize();
  fs.unlinkSync(tmpEnv);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
