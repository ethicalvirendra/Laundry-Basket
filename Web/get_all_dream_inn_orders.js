const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: 'c:\\Projects\\Laundry Basket\\Web\\.env' });

const OrderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', OrderSchema, 'orders');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const orders = await Order.find({ name: /DREAM INN/i }).lean();
        console.log(`Found ${orders.length} orders for DREAM INN:`);
        const result = orders.map(o => ({
            id: o.id,
            name: o.name,
            phone: o.phone,
            services: o.services,
            items_ordered: o.items_ordered,
            amount_estimate_details: o.amount_estimate_details,
            total: o.total,
            quantity: o.quantity
        }));
        console.log(JSON.stringify(result, null, 2));
        fs.writeFileSync('C:\\Users\\viren\\.gemini\\antigravity\\brain\\805a7168-1b41-4509-9afe-4c39073c5cfc\\scratch\\dream_inn_orders.json', JSON.stringify(orders, null, 2), 'utf8');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
