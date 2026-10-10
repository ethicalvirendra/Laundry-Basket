const ftp = require('basic-ftp');

async function main() {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  
  // Try different FTP hosts/credentials for Hostinger
  const attempts = [
    { host: '217.21.91.112', user: 'u130958259', pass: 'Laundry@9985', port: 21 },
    { host: 'laundrybasketunicorn.com', user: 'u130958259', pass: 'Laundry@9985', port: 21 },
    { host: '217.21.91.112', user: 'u130958259@laundrybasketunicorn.com', pass: 'Laundry@9985', port: 21 },
  ];
  
  for (const attempt of attempts) {
    try {
      console.log(`\nTrying FTP: ${attempt.user}@${attempt.host}:${attempt.port}`);
      await client.access({
        host: attempt.host,
        user: attempt.user,
        password: attempt.pass,
        port: attempt.port,
        secure: false,
        timeout: 15000,
      });
      
      console.log('✅ FTP Connected!');
      const list = await client.list('/');
      console.log('Remote root contents:');
      list.forEach(f => console.log(' -', f.name, f.isDirectory ? '(dir)' : `(${f.size} bytes)`));
      
      client.close();
      return;
    } catch (e) {
      console.log('  ❌ Failed:', e.message);
      client.close();
    }
  }
  
  console.log('\n❌ All FTP attempts failed. Hostinger may require a different FTP host.');
  console.log('Please check: hPanel → FTP Accounts for the correct FTP hostname.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
