const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const fs = require('fs');
const mongoose = require('./Web/node_modules/mongoose');

const envContent = fs.readFileSync('./Web/.env', 'utf-8');
const match = envContent.match(/MONGODB_URI=(.*)/);
const uri = match ? match[1].trim() : '';

async function run() {
    await mongoose.connect(uri);
    const Order = mongoose.connection.db.collection('orders');
    const orders = await Order.find({}).toArray();

    console.log(`Checking ${orders.length} orders in MongoDB...`);

    let updatedCount = 0;

    for (const o of orders) {
        if (!o.items_ordered) continue;

        const items = String(o.items_ordered).trim();
        const srvType = String(o.service_type || 'Laundry').trim();
        const qty = parseInt(o.quantity) || 1;
        const tot = Number(o.total) || 0;

        // Check if services matches items_ordered
        const currentServices = Array.isArray(o.services) ? o.services.join('; ') : String(o.services || '');
        const itemsPrefix = items.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8);
        const matchesCurrent = currentServices.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes(itemsPrefix);

        if (!matchesCurrent || currentServices.includes('Dry Clean ( SAREE) x5 (₹900)')) {
            // Build the clean, accurate service string
            const cleanServiceString = `${srvType} - ${items} x${qty} (₹${tot})`;
            
            await Order.updateOne(
                { _id: o._id },
                {
                    $set: {
                        services: [cleanServiceString],
                        subtotal: tot
                    }
                }
            );
            updatedCount++;
            console.log(`✅ Fixed order ${o.id} (${o.name}):`);
            console.log(`   Items: ${items}`);
            console.log(`   New Service: ${cleanServiceString}`);
        }
    }

    console.log(`\n🎉 Successfully fixed ${updatedCount} orders in MongoDB!`);

    await mongoose.disconnect();
}

run().catch(console.error);
