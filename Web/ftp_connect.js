const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

const FTP_HOST = '217.21.91.112';
const FTP_USER = 'u130958259';
const FTP_PASS = 'Laundry@9985';
const REMOTE_ROOT = '/home/u130958259/domains/laundrybasketunicorn.com/public_html';
const LOCAL_DIR = 'C:\\Projects\\Laundry Basket\\Web';

// Files/folders to EXCLUDE from upload
const EXCLUDE = new Set([
  'node_modules', '.next', '.git', 'manager-panel', 'admin-dashboard',
  'hostinger_api.js', 'hostinger_explore.js', 'sftp_test.js', 
  'ftp_test.js', 'ssh_deploy.js', 'ssh_test.js', 'sshrun.bat',
  'askpass.bat', 'deploy.sh', 'ssh_check.ps1', 'prepare_deploy.js'
]);

async function connect() {
  const client = new ftp.Client(30000);
  client.ftp.verbose = false;
  
  // Try different port/mode combinations
  const configs = [
    { host: FTP_HOST, user: FTP_USER, password: FTP_PASS, port: 21, secure: false },
    { host: FTP_HOST, user: FTP_USER, password: FTP_PASS, port: 21, secure: 'implicit' },
    { host: FTP_HOST, user: FTP_USER, password: FTP_PASS, port: 990, secure: true },
    { host: FTP_HOST, user: FTP_USER, password: FTP_PASS, port: 21, secure: false, pasv: true },
  ];

  for (const cfg of configs) {
    try {
      console.log(`Trying ftp://${cfg.user}@${cfg.host}:${cfg.port} secure=${cfg.secure}`);
      await client.access(cfg);
      console.log('✅ FTP Connected!');
      return client;
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
      try { client.close(); } catch(x){}
    }
  }
  return null;
}

async function main() {
  const client = await connect();
  if (!client) {
    console.log('\n❌ Could not connect via FTP. Check credentials.');
    return;
  }

  // List root
  console.log('\n📂 Remote directory listing:');
  try {
    const list = await client.list('/');
    list.forEach(f => console.log(' -', f.name, f.isDirectory ? '(dir)' : `(${f.size}b)`));
  } catch(e) {
    console.log('List error:', e.message);
  }

  // Check if public_html exists
  try {
    console.log('\n📂 public_html:');
    const list2 = await client.list(REMOTE_ROOT);
    list2.forEach(f => console.log(' -', f.name));
  } catch(e) {
    console.log('public_html error:', e.message);
  }

  client.close();
  console.log('\n✅ FTP check complete!');
}

main().catch(e => { console.error(e.message); process.exit(1); });
