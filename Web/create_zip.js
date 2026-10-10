const fs = require('fs');
const path = require('path');
const archiverLib = require('archiver');

const LOCAL_DIR = 'C:\\Projects\\Laundry Basket\\Web';
const OUT_ZIP = 'C:\\Projects\\Laundry Basket\\laundry_deploy.zip';

const ENV_CONTENT = `MONGODB_URI=mongodb://laundrybasketbpl_db_user:Loundry9985@ac-0hvxiiy-shard-00-00.dw5aoia.mongodb.net:27017,ac-0hvxiiy-shard-00-01.dw5aoia.mongodb.net:27017,ac-0hvxiiy-shard-00-02.dw5aoia.mongodb.net:27017/laundry_basket?ssl=true&authSource=admin&retryWrites=true&w=majority
PORT=5000
JWT_SECRET=laundry_basket_secret_key_2025
ADMIN_USER=admin
ADMIN_PASS=Admin_9985
MSG91_AUTH_KEY=499291A8wjqZYMS69c26d71P1
MSG91_TEMPLATE_ID=69c26e125a599fdfa30c8e73
NODE_ENV=production
`;

async function main() {
  if (fs.existsSync(OUT_ZIP)) fs.unlinkSync(OUT_ZIP);

  const output = fs.createWriteStream(OUT_ZIP);
  
  // archiver module exports a class-based API
  const archive = new archiverLib.ZipArchive({ zlib: { level: 6 } });

  output.on('close', () => {
    const mb = (fs.statSync(OUT_ZIP).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅ ZIP created successfully!`);
    console.log(`📦 Size: ${mb} MB`);
    console.log(`📍 Location: ${OUT_ZIP}`);
    console.log(`\n👉 Upload this ZIP in Hostinger → Deployments`);
  });

  archive.on('warning', w => console.warn('Warning:', w.message));
  archive.on('error', e => { throw e; });
  archive.pipe(output);

  const tempEnv = path.join(LOCAL_DIR, '.env.deploy_temp');
  fs.writeFileSync(tempEnv, ENV_CONTENT);

  console.log('📦 Adding files to zip...\n');

  const coreFiles = ['server.js', 'package.json', 'serviceAccountKey.json', 'robots.txt', 'sitemap.xml', 'index.html'];
  for (const f of coreFiles) {
    const full = path.join(LOCAL_DIR, f);
    if (fs.existsSync(full)) {
      archive.file(full, { name: f });
      console.log(`  ✓ ${f}`);
    }
  }

  archive.file(tempEnv, { name: '.env' });
  console.log(`  ✓ .env (production)`);

  const dirs = ['Pages', 'assets', 'images', '.well-known'];
  for (const d of dirs) {
    const full = path.join(LOCAL_DIR, d);
    if (fs.existsSync(full)) {
      archive.directory(full, d);
      console.log(`  ✓ ${d}/`);
    }
  }

  await archive.finalize();
  fs.unlinkSync(tempEnv);
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
