const fs = require('fs');
const path = require('path');
const BASE = 'C:/Projects/Laundry Basket/Web';

const checks = [
  'admin-dashboard/out',
  'manager-panel/out',
  'admin-dashboard/.next',
  'manager-panel/.next',
  'web-deployment/admin',
  'web-deployment/manager',
];

checks.forEach(p => {
  const full = path.join(BASE, p);
  const exists = fs.existsSync(full);
  if (exists) {
    const items = fs.readdirSync(full).slice(0, 5);
    console.log(`✅ ${p} — [${items.join(', ')}...]`);
  } else {
    console.log(`❌ ${p} — MISSING`);
  }
});
