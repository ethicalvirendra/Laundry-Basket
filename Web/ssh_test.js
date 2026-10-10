const { execSync, spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const SSH = 'C:\\Windows\\System32\\OpenSSH\\ssh.exe';
const SCP = 'C:\\Windows\\System32\\OpenSSH\\scp.exe';
const HOST = 'u130958259@217.21.91.112';
const PORT = '65002';
const PASS = 'Laundry@9985';
const REMOTE_DIR = '/home/u130958259/domains/laundrybasketunicorn.com/public_html';
const LOCAL_DIR = 'C:\\Projects\\Laundry Basket\\Web';

// Use expect-like approach via SSH with key
function sshCmd(command) {
  const args = [
    '-p', PORT,
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'PasswordAuthentication=yes',
    '-o', 'PubkeyAuthentication=no',
    '-o', 'ConnectTimeout=15',
    HOST,
    command
  ];
  
  console.log(`\n$ ${command.substring(0, 100)}`);
  try {
    const result = execSync(`"${SSH}" ${args.map(a => `"${a}"`).join(' ')}`, {
      timeout: 60000,
      env: {
        ...process.env,
        SSH_ASKPASS: path.join(LOCAL_DIR, 'askpass.bat'),
        SSH_ASKPASS_REQUIRE: 'force',
        DISPLAY: ':0',
      }
    });
    const output = result.toString().trim();
    if (output) console.log(output);
    return output;
  } catch (e) {
    const out = e.stdout ? e.stdout.toString().trim() : '';
    const err = e.stderr ? e.stderr.toString().trim() : '';
    if (out) console.log(out);
    if (err) console.log('err:', err.substring(0, 200));
    return out;
  }
}

// Check connection
console.log('Testing SSH connection to Hostinger...');
const test = sshCmd('echo "CONNECTED_OK" && node --version && npm --version');
if (test.includes('CONNECTED_OK')) {
  console.log('\n✅ SSH Connected successfully!');
} else {
  console.log('\n❌ Connection issue. Output:', test);
}
