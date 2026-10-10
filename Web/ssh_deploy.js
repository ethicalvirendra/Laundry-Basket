const { NodeSSH } = require('node-ssh');
const path = require('path');
const os = require('os');
const fs = require('fs');

const ssh = new NodeSSH();
const REMOTE_DIR = '/home/u130958259/domains/laundrybasketunicorn.com/public_html';
const LOCAL_DIR = 'C:\\Projects\\Laundry Basket\\Web';

async function run(cmd, opts = {}) {
  console.log(`\n🔧 ${cmd.substring(0, 80)}`);
  const result = await ssh.execCommand(cmd, { cwd: opts.cwd || REMOTE_DIR, ...opts });
  if (result.stdout) console.log(result.stdout);
  if (result.stderr && result.stderr.trim() && !result.stderr.includes('npm warn') && !result.stderr.includes('Warning')) {
    console.log('⚠️', result.stderr.substring(0, 300));
  }
  return result;
}

async function main() {
  console.log('🔌 Connecting to Hostinger server...');
  
  const privateKeyPath = path.join(os.homedir(), '.ssh', 'hostinger_rsa');
  
  try {
    // Try key-based auth first
    await ssh.connect({
      host: '217.21.91.112',
      port: 65002,
      username: 'u130958259',
      privateKeyPath,
      readyTimeout: 20000,
    });
    console.log('✅ Connected via SSH key!');
  } catch (e1) {
    console.log('Key auth failed, trying password...');
    try {
      await ssh.connect({
        host: '217.21.91.112',
        port: 65002,
        username: 'u130958259',
        password: 'Laundry@9985',
        readyTimeout: 20000,
        tryKeyboard: true,
      });
      console.log('✅ Connected via password!');
    } catch (e2) {
      console.error('Both auth methods failed:', e2.message);
      process.exit(1);
    }
  }

  // Step 1: Explore server
  console.log('\n=== SERVER INFO ===');
  await run('pwd', { cwd: '/home/u130958259' });
  await run('ls -la /home/u130958259/', { cwd: '/home/u130958259' });
  const domainsResult = await run('ls -la /home/u130958259/domains/ 2>/dev/null || echo "NO_DOMAINS"', { cwd: '/home/u130958259' });
  
  if (!domainsResult.stdout.includes('NO_DOMAINS')) {
    await run('ls -la /home/u130958259/domains/laundrybasketunicorn.com/ 2>/dev/null || echo "DOMAIN_NOT_FOUND"', { cwd: '/home/u130958259' });
  }
  
  await run('node --version', { cwd: '/home/u130958259' });
  await run('npm --version', { cwd: '/home/u130958259' });
  await run('pm2 --version 2>/dev/null || echo "PM2 not installed"', { cwd: '/home/u130958259' });
  await run('cat /home/u130958259/domains/laundrybasketunicorn.com/.env 2>/dev/null || echo "No .env found"', { cwd: '/home/u130958259' });

  ssh.dispose();
  console.log('\n✅ Server check complete!');
}

main().catch(err => {
  console.error('Fatal Error:', err.message);
  try { ssh.dispose(); } catch(e) {}
  process.exit(1);
});
