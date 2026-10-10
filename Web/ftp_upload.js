const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

const FTP_HOST = '217.21.91.112';
const FTP_USER = 'u130958259';
const FTP_PASS = 'Laundry@9985';
const LOCAL_DIR = 'C:\\Projects\\Laundry Basket\\Web';

// Folders/files to skip
const EXCLUDE = new Set([
  'node_modules', '.next', '.git', 'manager-panel', 'admin-dashboard',
  'hostinger_api.js', 'hostinger_explore.js', 'sftp_test.js', 
  'ftp_test.js', 'ftp_connect.js', 'ftp_explore.js', 'ftp_upload.js',
  'ssh_deploy.js', 'ssh_test.js', 'sshrun.bat', 'askpass.bat', 
  'deploy.sh', 'ssh_check.ps1', 'prepare_deploy.js',
  'laundry_basket_prod.zip'
]);

async function connect() {
  const client = new ftp.Client(60000);
  client.ftp.verbose = false;
  await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASS, port: 21, secure: false });
  return client;
}

async function ensureDir(client, dir) {
  try {
    await client.ensureDir(dir);
  } catch(e) {
    console.log('ensureDir error:', e.message);
  }
}

async function uploadDir(client, localPath, remotePath, depth = 0) {
  const pad = '  '.repeat(depth);
  const items = fs.readdirSync(localPath);
  
  for (const item of items) {
    if (EXCLUDE.has(item)) {
      console.log(`${pad}⏭️  SKIP: ${item}`);
      continue;
    }
    
    const localItem = path.join(localPath, item);
    const remoteItem = remotePath + '/' + item;
    const stat = fs.statSync(localItem);
    
    if (stat.isDirectory()) {
      console.log(`${pad}📁 Creating dir: ${remoteItem}`);
      try {
        await client.ensureDir(remoteItem);
        await client.cd(remoteItem);
        await uploadDir(client, localItem, remoteItem, depth + 1);
      } catch(e) {
        console.log(`${pad}❌ Dir error: ${e.message}`);
      }
    } else {
      try {
        console.log(`${pad}⬆️  Upload: ${item} (${Math.round(stat.size/1024)}KB)`);
        await client.uploadFrom(localItem, remoteItem);
      } catch(e) {
        console.log(`${pad}❌ Upload error ${item}: ${e.message}`);
      }
    }
  }
}

async function main() {
  console.log('🔌 Connecting to Hostinger FTP...');
  const client = await connect();
  
  // Find current directory
  const pwd = await client.pwd();
  console.log('📍 Current remote dir:', pwd);
  
  const list = await client.list();
  console.log('\n📂 Root contents:');
  list.forEach(f => console.log(' -', f.isDirectory ? 'DIR' : 'FILE', f.name));
  
  // Find the correct app directory
  let appDir = pwd;
  
  // Check common paths
  const checkPaths = [
    '/domains/laundrybasketunicorn.com/public_html',
    '/public_html',
    '/domains/laundrybasketunicorn.com',
    '/',
  ];
  
  let targetDir = pwd; // default to current
  for (const p of checkPaths) {
    try {
      await client.cd(p);
      const d = await client.pwd();
      const l = await client.list();
      console.log(`\n✅ Accessible: ${d}`);
      l.slice(0, 5).forEach(f => console.log('  -', f.name));
      targetDir = d;
      break;
    } catch(e) {
      // skip
    }
  }
  
  // Go back to root and check domains
  try {
    await client.cd(pwd);
    const domainsList = list.filter(f => f.isDirectory && f.name === 'domains');
    if (domainsList.length > 0) {
      await client.cd(pwd + '/domains');
      const domains = await client.list();
      console.log('\n📂 Domains:');
      domains.forEach(f => console.log(' -', f.name));
      
      // Try laundrybasketunicorn.com
      try {
        await client.cd(pwd + '/domains/laundrybasketunicorn.com');
        const siteDirs = await client.list();
        console.log('\n📂 Site dirs:');
        siteDirs.forEach(f => console.log(' -', f.name));
        
        // Create public_html if needed
        const hasPublicHtml = siteDirs.some(f => f.name === 'public_html');
        if (!hasPublicHtml) {
          console.log('\n📁 Creating public_html...');
          await client.ensureDir(pwd + '/domains/laundrybasketunicorn.com/public_html');
        }
        
        targetDir = pwd + '/domains/laundrybasketunicorn.com/public_html';
      } catch(e) {
        console.log('Domain dir error:', e.message);
      }
    }
  } catch(e) {
    console.log('Navigation error:', e.message);
  }
  
  console.log(`\n🎯 Target upload directory: ${targetDir}`);
  console.log('\n🚀 Starting upload... (this will take a few minutes)');
  
  await client.cd(targetDir);
  await uploadDir(client, LOCAL_DIR, targetDir);
  
  // Upload .env file  
  console.log('\n📝 Uploading .env...');
  const envContent = `MONGODB_URI=mongodb://laundrybasketbpl_db_user:Loundry9985@ac-0hvxiiy-shard-00-00.dw5aoia.mongodb.net:27017,ac-0hvxiiy-shard-00-01.dw5aoia.mongodb.net:27017,ac-0hvxiiy-shard-00-02.dw5aoia.mongodb.net:27017/laundry_basket?ssl=true&authSource=admin&retryWrites=true&w=majority
PORT=5000
JWT_SECRET=laundry_basket_secret_key_2025
ADMIN_USER=admin
ADMIN_PASS=Admin_9985
MSG91_AUTH_KEY=499291A8wjqZYMS69c26d71P1
MSG91_TEMPLATE_ID=69c26e125a599fdfa30c8e73
NODE_ENV=production
`;
  fs.writeFileSync('C:\\Projects\\Laundry Basket\\Web\\.env.production', envContent);
  await client.uploadFrom('C:\\Projects\\Laundry Basket\\Web\\.env.production', targetDir + '/.env');
  fs.unlinkSync('C:\\Projects\\Laundry Basket\\Web\\.env.production');

  client.close();
  console.log('\n✅ Upload complete!');
  console.log(`\n🌍 Site: https://www.laundrybasketunicorn.com`);
  console.log('⚠️  Remember to set Node.js entry point to server.js in hPanel!');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
