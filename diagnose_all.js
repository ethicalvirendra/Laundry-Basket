// Check all the real issues:
// 1. Orders with no name/items_ordered (garbage rows)  
// 2. Rate card with zero price
// 3. Customers with no name
// 4. Store missing address
// 5. parseServiceString accuracy

const mongoose = require('./Web/node_modules/mongoose');
const dotenv = require('./Web/node_modules/dotenv');
dotenv.config({ path: './Web/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  
  // 1. Garbage orders (no name AND no items_ordered)
  const garbageOrders = await db.collection('orders').find({ 
    $or: [{ customer_name: null }, { customer_name: '' }, { customer_name: { $exists: false } }]
  }).toArray();
  console.log('=== GARBAGE ORDERS (no name) ===');
  garbageOrders.forEach(o => {
    console.log('_id:', o._id, '| total:', o.total, '| timestamp:', o.timestamp, '| source:', o.source);
    console.log('  ALL FIELDS:', Object.keys(o).join(', '));
  });

  // 2. Rate card with zero price
  const zeroRates = await db.collection('rates').find({ $or: [{ price: 0 }, { price: null }, { price: { $exists: false } }] }).toArray();
  console.log('\n=== ZERO PRICE RATE ITEMS ===');
  zeroRates.forEach(r => console.log('_id:', r._id, '| item:', r.item || r.name, '| service:', r.service, '| price:', r.price));

  // 3. Customers without name
  const noNameCx = await db.collection('customers').find({ 
    $or: [{ name: null }, { name: '' }, { name: { $exists: false } }] 
  }).toArray();
  console.log('\n=== CUSTOMERS WITHOUT NAME ===');
  noNameCx.forEach(c => console.log('_id:', c._id, '| phone:', c.phone, '| all fields:', Object.keys(c).join(', ')));

  // 4. Stores missing address
  const stores = await db.collection('stores').find({}).toArray();
  console.log('\n=== STORE DETAILS ===');
  stores.forEach(s => console.log(JSON.stringify(s, null, 2)));

  // 5. Sample parseServiceString test
  console.log('\n=== SAMPLE SERVICE STRINGS FROM RECENT ORDERS ===');
  const recentOrders = await db.collection('orders').find({}).sort({ _id: -1 }).limit(10).toArray();
  recentOrders.forEach(o => {
    console.log(`[${o.id}] ${o.customer_name} | services:`, JSON.stringify(o.services));
  });

  process.exit(0);
}).catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });
