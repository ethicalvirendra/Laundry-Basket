const https = require('https');

const TOKEN = 'u3pQSzSAIiVJqehJbU4BehftnIX9pSeHl6XRVd3ffaaf930f';
const BASE = 'developers.hostinger.com';
const DOMAIN = 'laundrybasketunicorn.com';
const ORDER_ID = 1009228016;

function api(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BASE,
      path: endpoint,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Try to get FTP credentials
  console.log('=== FTP CREDENTIALS ===');
  const ftp = await api(`/api/hosting/v1/websites/${DOMAIN}/ftp/accounts`);
  console.log('FTP Status:', ftp.status, JSON.stringify(ftp.data, null, 2));

  // Try file manager / ssh credentials
  console.log('\n=== SSH CREDENTIALS ===');
  const ssh = await api(`/api/hosting/v1/websites/${DOMAIN}/ssh`);
  console.log('SSH Status:', ssh.status, JSON.stringify(ssh.data, null, 2));

  // Check nodejs / app info
  console.log('\n=== NODE.JS APP INFO ===');
  const nodejs = await api(`/api/hosting/v1/websites/${DOMAIN}/node`);
  console.log('NodeJS Status:', nodejs.status, JSON.stringify(nodejs.data, null, 2));

  // Try git setup
  console.log('\n=== GIT SETUP ===');
  const git = await api(`/api/hosting/v1/websites/${DOMAIN}/git`, 'POST', {
    branch: 'main',
    repository: 'https://github.com/laundrybasket/app.git'
  });
  console.log('Git Status:', git.status, JSON.stringify(git.data, null, 2));

  // List all available endpoints for this website
  const endpoints = [
    `/api/hosting/v1/websites/${DOMAIN}/ftp`,
    `/api/hosting/v1/websites/${DOMAIN}/access`,
    `/api/hosting/v1/websites/${DOMAIN}/php`,
    `/api/hosting/v1/websites/${DOMAIN}/crons`,
    `/api/hosting/v1/websites/${DOMAIN}/app`,
    `/api/hosting/v1/websites/${DOMAIN}`,
  ];
  
  console.log('\n=== WEBSITE DETAIL ===');
  for (const ep of endpoints) {
    const r = await api(ep);
    if (r.status !== 404) {
      console.log(`\n${ep} [${r.status}]:`);
      console.log(JSON.stringify(r.data, null, 2).substring(0, 500));
    }
  }
}

main().catch(e => { console.error('Error:', e.message); });
