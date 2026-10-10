const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOKEN = 'u3pQSzSAIiVJqehJbU4BehftnIX9pSeHl6XRVd3ffaaf930f';
const BASE = 'developers.hostinger.com';

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
  console.log('🔑 Testing API token...\n');

  // List hosting orders
  const orders = await api('/api/hosting/v1/orders');
  console.log('=== HOSTING ORDERS ===');
  console.log('Status:', orders.status);
  if (orders.status === 200) {
    const data = orders.data.data || orders.data;
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(JSON.stringify(orders.data, null, 2));
  }

  console.log('\n=== WEBSITES ===');
  const sites = await api('/api/hosting/v1/websites');
  console.log('Status:', sites.status);
  if (sites.status === 200) {
    const data = sites.data.data || sites.data;
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(JSON.stringify(sites.data, null, 2));
  }

  // Get git info if available
  if (sites.status === 200) {
    const siteList = sites.data.data || [];
    for (const site of siteList) {
      console.log(`\n=== GIT for ${site.domain} ===`);
      const git = await api(`/api/hosting/v1/websites/${site.domain}/git`);
      console.log('Status:', git.status);
      console.log(JSON.stringify(git.data, null, 2));
    }
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
