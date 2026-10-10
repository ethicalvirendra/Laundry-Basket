const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

const FTP_HOST = '217.21.91.112';
const FTP_USER = 'u130958259';
const FTP_PASS = 'Laundry@9985';
const LOCAL_DIR = 'C:\\Projects\\Laundry Basket\\Web';

// Files/folders to EXCLUDE from upload
const EXCLUDE = new Set([
  'node_modules', '.next', '.git', '.env',
  'hostinger_api.js', 'hostinger_explore.js', 'sftp_test.js', 
  'ftp_test.js', 'ftp_connect.js', 'ssh_deploy.js', 'ssh_test.js', 
  'sshrun.bat', 'askpass.bat', 'deploy.sh', 'ssh_check.ps1', 
  'prepare_deploy.js', 'package-lock.json', 'laundry_basket_prod.zip'
]);

async function connect() {
  const client = new ftp.Client(60000);
  client.ftp.verbose = false;
  await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASS, port: 21, secure: false });
  return client;
}

async function exploreDir(client, remoteDir, depth = 0) {
  try {
    const list = await client.list(remoteDir);
    const pad = '  '.repeat(depth);
    for (const item of list) {
      console.log(`${pad}- ${item.name} ${item.isDirectory ? '(dir)' : `(${item.size}b)`}`);
      if (item.isDirectory && depth < 2) {
        await exploreDir(client, `${remoteDir}/${item.name}`, depth + 1);
      }
    }
  } catch(e) {
    console.log('  '.repeat(depth) + 'error:', e.message);
  }
}

async function main() {
  console.log('🔌 Connecting to FTP...');
  const client = await connect();
  console.log('✅ Connected!\n');

  console.log('📂 Full server structure:');
  await exploreDir(client, '/home/u130958259');

  client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
