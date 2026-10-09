// FIX ALL ISSUES COMPREHENSIVELY
const mongoose = require('./Web/node_modules/mongoose');
const dotenv = require('./Web/node_modules/dotenv');
dotenv.config({ path: './Web/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  let fixCount = 0;
  
  // ============================================================
  // FIX 1: Orders where customer_name is null but name is set
  // ============================================================
  console.log('=== FIX 1: Sync customer_name from name field ===');
  const ordersNameMissing = await db.collection('orders').find({
    $or: [
      { customer_name: null },
      { customer_name: '' },
      { customer_name: { $exists: false } }
    ],
    name: { $exists: true, $ne: null, $ne: '' }
  }).toArray();
  
  for (const o of ordersNameMissing) {
    if (o.name) {
      await db.collection('orders').updateOne({ _id: o._id }, {
        $set: {
          customer_name: o.name,
          mobile_number: o.phone || o.mobile_number || '',
          customer_id: o.id || o.customer_id || ''
        }
      });
      console.log(`  Fixed customer_name for [${o.id}] ${o.name}`);
      fixCount++;
    }
  }
  
  // ============================================================
  // FIX 2: Orders where name is null but customer_name is set
  // ============================================================
  console.log('\n=== FIX 2: Sync name from customer_name field ===');
  const ordersNameNull = await db.collection('orders').find({
    $or: [
      { name: null },
      { name: '' },
      { name: { $exists: false } }
    ],
    customer_name: { $exists: true, $ne: null, $ne: '' }
  }).toArray();
  
  for (const o of ordersNameNull) {
    if (o.customer_name) {
      await db.collection('orders').updateOne({ _id: o._id }, {
        $set: { name: o.customer_name }
      });
      console.log(`  Fixed name for [${o.id}] ${o.customer_name}`);
      fixCount++;
    }
  }
  
  // ============================================================
  // FIX 3: Orders with both name AND customer_name null (orphans)
  // ============================================================
  console.log('\n=== FIX 3: Identify orphan orders (no name at all) ===');
  const orphanOrders = await db.collection('orders').find({
    $or: [{ name: null }, { name: '' }, { name: { $exists: false } }],
    $and: [{ $or: [{ customer_name: null }, { customer_name: '' }, { customer_name: { $exists: false } }] }]
  }).toArray();
  console.log('Orphan orders (unfixable without data):', orphanOrders.length);
  orphanOrders.forEach(o => {
    console.log(`  [${o._id}] total:${o.total} source:${o.source} ts:${o.timestamp}`);
  });
  
  // ============================================================
  // FIX 4: Rate items with price = 0, set to null (hide from UI)
  // ============================================================
  console.log('\n=== FIX 4: Flag zero-price rate items ===');
  const zeroRates = await db.collection('rates').find({ price: 0 }).toArray();
  for (const r of zeroRates) {
    // Set price to null so UI won't show them, or keep as 0 - just log
    console.log(`  Zero price: ${r.item} (keeping as 0 - price on request)`);
  }
  
  // ============================================================
  // FIX 5: Store address - add address field from location
  // ============================================================
  console.log('\n=== FIX 5: Fix store address field ===');
  const stores = await db.collection('stores').find({}).toArray();
  for (const s of stores) {
    if (s.location && !s.address) {
      await db.collection('stores').updateOne({ _id: s._id }, {
        $set: { address: s.location }
      });
      console.log(`  Fixed store address for ${s.name}: ${s.location}`);
      fixCount++;
    }
  }
  
  // ============================================================
  // FIX 6: Ensure all orders have phone field = mobile_number if missing
  // ============================================================
  console.log('\n=== FIX 6: Sync phone from mobile_number ===');
  const ordersNoPhone = await db.collection('orders').find({
    $or: [{ phone: null }, { phone: '' }, { phone: { $exists: false } }],
    mobile_number: { $exists: true, $ne: null, $ne: '' }
  }).toArray();
  for (const o of ordersNoPhone) {
    await db.collection('orders').updateOne({ _id: o._id }, {
      $set: { phone: String(o.mobile_number) }
    });
    console.log(`  Fixed phone for [${o.id}] ${o.customer_name}: ${o.mobile_number}`);
    fixCount++;
  }
  
  // ============================================================
  // FIX 7: Orders where id field is missing (create from customer_id or _id)
  // ============================================================
  console.log('\n=== FIX 7: Orders missing id field ===');
  const noIdOrders = await db.collection('orders').find({
    $or: [{ id: null }, { id: '' }, { id: { $exists: false } }]
  }).toArray();
  console.log(`Orders missing id: ${noIdOrders.length}`);
  for (const o of noIdOrders) {
    if (o.customer_id) {
      await db.collection('orders').updateOne({ _id: o._id }, {
        $set: { id: o.customer_id }
      });
      console.log(`  Fixed id for [${o.customer_id}] ${o.customer_name}`);
      fixCount++;
    }
  }
  
  console.log(`\n=== DONE: ${fixCount} fixes applied ===`);
  
  // Final verification
  const finalOrders = await db.collection('orders').find({}).toArray();
  const stillNoName = finalOrders.filter(o => !o.name && !o.customer_name).length;
  const stillNoId = finalOrders.filter(o => !o.id).length;
  const stillNoPhone = finalOrders.filter(o => !o.phone).length;
  console.log('\n=== POST-FIX VERIFICATION ===');
  console.log('Orders still without name:', stillNoName);
  console.log('Orders still without id:', stillNoId);
  console.log('Orders still without phone:', stillNoPhone);
  
  process.exit(0);
}).catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });
