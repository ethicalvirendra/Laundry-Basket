const fs = require('fs');
const path = require('path');
const archiverLib = require('archiver');

const BASE = 'C:/Projects/Laundry Basket/Web';

const ENV = `MONGODB_URI=mongodb://laundrybasketbpl_db_user:Loundry9985@ac-0hvxiiy-shard-00-00.dw5aoia.mongodb.net:27017,ac-0hvxiiy-shard-00-01.dw5aoia.mongodb.net:27017,ac-0hvxiiy-shard-00-02.dw5aoia.mongodb.net:27017/laundry_basket?ssl=true&authSource=admin&retryWrites=true&w=majority
PORT=5000
JWT_SECRET=laundry_basket_secret_key_2025
ADMIN_USER=admin
ADMIN_PASS=Admin_9985
MSG91_AUTH_KEY=499291A8wjqZYMS69c26d71P1
MSG91_TEMPLATE_ID=69c26e125a599fdfa30c8e73
NODE_ENV=production
`;

function makeZip(outPath) {
  const output = fs.createWriteStream(outPath);
  const archive = new archiverLib.ZipArchive({ zlib: { level: 6 } });
  archive.on('error', e => { throw e; });
  archive.pipe(output);
  return { archive, done: new Promise(r => output.on('close', r)) };
}

async function main() {
  // ── ZIP 1: nodejs folder (backend) ──────────────────────────
  const BACKEND_ZIP = 'C:/Projects/Laundry Basket/1_NODEJS_FOLDER.zip';
  if (fs.existsSync(BACKEND_ZIP)) fs.unlinkSync(BACKEND_ZIP);

  const tmpEnv = path.join(BASE, '.env.tmp');
  fs.writeFileSync(tmpEnv, ENV);

  const b = makeZip(BACKEND_ZIP);
  console.log('📦 ZIP 1 — nodejs/ folder (backend):');

  // Core backend files (go in root of nodejs/)
  const backendFiles = ['server.js', 'package.json', 'serviceAccountKey.json', 'robots.txt', 'sitemap.xml'];
  for (const f of backendFiles) {
    const fp = path.join(BASE, f);
    if (fs.existsSync(fp)) {
      b.archive.file(fp, { name: f });
      console.log(`  ✓ ${f}`);
    }
  }
  b.archive.file(tmpEnv, { name: '.env' });
  console.log('  ✓ .env (production)');

  // backend/ subfolder (server reads serviceAccountKey from ./backend/)
  const backendKey = path.join(BASE, 'backend', 'serviceAccountKey.json');
  if (fs.existsSync(backendKey)) {
    b.archive.file(backendKey, { name: 'backend/serviceAccountKey.json' });
    console.log('  ✓ backend/serviceAccountKey.json');
  }

  // Admin & Manager panels (served as static by Express)
  const adminOut = path.join(BASE, 'admin-dashboard', 'out');
  const managerOut = path.join(BASE, 'manager-panel', 'out');
  if (fs.existsSync(adminOut)) {
    b.archive.directory(adminOut, 'admin-dashboard/out');
    console.log('  ✓ admin-dashboard/out/ (admin panel)');
  }
  if (fs.existsSync(managerOut)) {
    b.archive.directory(managerOut, 'manager-panel/out');
    console.log('  ✓ manager-panel/out/ (manager panel)');
  }

  await b.archive.finalize();
  await b.done;
  const s1 = (fs.statSync(BACKEND_ZIP).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ ZIP 1 done: ${s1} MB → ${BACKEND_ZIP}\n`);

  // ── ZIP 2: public_html folder (website) ──────────────────────
  const WEB_ZIP = 'C:/Projects/Laundry Basket/2_PUBLIC_HTML_FOLDER.zip';
  if (fs.existsSync(WEB_ZIP)) fs.unlinkSync(WEB_ZIP);

  const w = makeZip(WEB_ZIP);
  console.log('🌐 ZIP 2 — public_html/ folder (website):');

  w.archive.file(path.join(BASE, 'index.html'), { name: 'index.html' });
  console.log('  ✓ index.html');

  const webDirs = ['Pages', 'assets', 'images', '.well-known'];
  for (const d of webDirs) {
    const dp = path.join(BASE, d);
    if (fs.existsSync(dp)) {
      w.archive.directory(dp, d);
      console.log(`  ✓ ${d}/`);
    }
  }

  await w.archive.finalize();
  await w.done;
  const s2 = (fs.statSync(WEB_ZIP).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ ZIP 2 done: ${s2} MB → ${WEB_ZIP}`);

  fs.unlinkSync(tmpEnv);

  console.log('\n========================================');
  console.log('📂 Upload 1_NODEJS_FOLDER.zip  → into  nodejs/       folder');
  console.log('📂 Upload 2_PUBLIC_HTML_FOLDER.zip → into  public_html/ folder');
  console.log('========================================');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
