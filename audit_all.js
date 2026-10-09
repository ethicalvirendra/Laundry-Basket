// Comprehensive audit script
const mongoose = require('./Web/node_modules/mongoose');
const dotenv = require('./Web/node_modules/dotenv');
dotenv.config({ path: './Web/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const orders = await db.collection('orders').find({}).toArray();
  
  console.log('=== ORDER AUDIT ===');
  console.log('Total orders:', orders.length);
  
  let issues = [];
  
  orders.forEach(o => {
    const prob = [];
    if (!o.services || o.services.length === 0) prob.push('NO_SERVICES');
    if (!o.total || o.total === 0) prob.push('ZERO_TOTAL');
    if (!o.phone) prob.push('NO_PHONE');
    if (!o.order_id) prob.push('NO_ORDER_ID');
    if (!o.customer_name) prob.push('NO_NAME');
    if (!o.items_ordered) prob.push('NO_ITEMS_ORDERED');
    if (!o.status) prob.push('NO_STATUS');
    if (prob.length > 0) {
      issues.push({ id: o.order_id, name: o.customer_name, total: o.total, problems: prob });
    }
  });
  
  console.log('Orders with issues:', issues.length);
  issues.forEach(i => console.log(' -', i.id, i.name, 'TOTAL:', i.total, 'ISSUES:', i.problems.join(', ')));
  
  // Sample 5 recent good orders
  console.log('\n=== SAMPLE RECENT ORDERS (last 5) ===');
  const recent = orders
    .filter(o => o.order_id)
    .sort((a,b) => (b.order_id||'').localeCompare(a.order_id||''))
    .slice(0, 5);
  recent.forEach(o => {
    console.log(`[${o.order_id}] ${o.customer_name} | Total: ${o.total} | Services: ${(o.services||[]).join(' | ').slice(0,80)} | Status: ${o.status}`);
  });
  
  // Check for customers
  const customers = await db.collection('customers').find({}).toArray();
  console.log('\n=== CUSTOMER AUDIT ===');
  console.log('Total customers:', customers.length);
  let noPhone = customers.filter(c => !c.phone).length;
  let noName = customers.filter(c => !c.name).length;
  console.log('Customers without phone:', noPhone);
  console.log('Customers without name:', noName);
  
  // Check rate cards
  const rates = await db.collection('rates').find({}).toArray();
  console.log('\n=== RATE CARD AUDIT ===');
  console.log('Total rate items:', rates.length);
  let zeroRate = rates.filter(r => !r.price || r.price === 0).length;
  console.log('Rate items with zero price:', zeroRate);
  
  // Check stores
  const stores = await db.collection('stores').find({}).toArray();
  console.log('\n=== STORES AUDIT ===');
  console.log('Total stores:', stores.length);
  stores.forEach(s => console.log(' -', s.name || s.store_name, '| Address:', s.address));
  
  process.exit(0);
}).catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });
