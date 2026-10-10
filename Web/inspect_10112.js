const mongoose = require('mongoose');
require('dotenv').config();

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const col = mongoose.connection.db.collection('orders');
        const orders = await col.find({ id: { $in: ['LBBPLAN10112', 'LBBPLAN10111', 'LBBPLAN10110'] } }).toArray();
        for (const o of orders) {
            console.log('--- Order:', o.id, '---');
            console.log('Customer:', o.name, o.customer_name);
            console.log('Total:', o.total);
            console.log('Subtotal:', o.subtotal);
            console.log('Amount:', o.amount);
            console.log('received_amount:', o.received_amount);
            console.log('pending_amount:', o.pending_amount);
            console.log('Services:', o.services);
            console.log('Items ordered:', o.items_ordered);
            console.log('Order Date:', o.order_date);
            console.log('Delivery Date:', o.delivery_date);
            console.log('Raw object keys:', Object.keys(o));
        }
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
inspect();
