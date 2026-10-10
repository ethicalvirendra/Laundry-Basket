const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ordersCol = mongoose.connection.collection('orders');
  
  // Find all active orders that were marked as isLegacyOrder: true
  const activeStatuses = ['Pending', 'Out for Pickup', 'Pickup Done', 'Delivered at Store', 'Washing', 'Drying', 'Ironing', 'Processing', 'Ready', 'Out for Delivery'];
  
  const misarchived = await ordersCol.find({
    isLegacyOrder: true,
    status: { $in: activeStatuses }
  }).toArray();

  console.log(`Found ${misarchived.length} ACTIVE orders marked as legacy:`);
  misarchived.forEach(o => {
    console.log(`- ${o.id}: ${o.name} | Status: ${o.status} | Total: ₹${o.total} | Date: ${o.timestamp}`);
  });

  await mongoose.disconnect();
}

run();
