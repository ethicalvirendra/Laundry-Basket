const { NodeSSH } = require('node-ssh');
const path = require('path');
const os = require('os');

// Hostinger Node.js hosting uses SFTP (not shell SSH)
// Let's test SFTP connection
const ssh = new NodeSSH();

async function main() {
  console.log('Testing SFTP connection to Hostinger...');
  
  try {
    await ssh.connect({
      host: '217.21.91.112',
      port: 65002,
      username: 'u130958259',
      password: 'Laundry@9985',
      readyTimeout: 20000,
      // Force only password auth, no keyboard-interactive
      authHandler: ['password'],
    });
    
    console.log('✅ SFTP Connected!');
    
    const sftp = await ssh.requestSFTP();
    console.log('✅ SFTP session ready!');
    
    // List root directory
    sftp.readdir('/home/u130958259', (err, list) => {
      if (err) console.log('readdir err:', err.message);
      else console.log('Remote dir contents:', list.map(f => f.filename).join(', '));
      ssh.dispose();
    });
    
  } catch (e) {
    console.error('Connect failed:', e.message);
    process.exit(1);
  }
}

main();
