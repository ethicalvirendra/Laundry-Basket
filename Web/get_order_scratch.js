const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'c:\\Projects\\Laundry Basket\\Web\\.env' });

const OrderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', OrderSchema, 'orders');

async function checkOrder() {
    const logPath = 'C:\\Users\\viren\\.gemini\\antigravity\\brain\\805a7168-1b41-4509-9afe-4c39073c5cfc\\scratch\\order_output.json';
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected!");
        const order = await Order.findOne({ id: 'LBBPLBAN000377' });
        if (order) {
            fs.writeFileSync(logPath, JSON.stringify(order.toObject(), null, 2), 'utf8');
            console.log("Saved order to: " + logPath);
        } else {
            fs.writeFileSync(logPath, JSON.stringify({ error: "Order not found" }, null, 2), 'utf8');
            console.log("Order LBBPLBAN000377 not found!");
        }
    } catch (e) {
        console.error("Error:", e);
        fs.writeFileSync(logPath, JSON.stringify({ error: e.message, stack: e.stack }, null, 2), 'utf8');
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkOrder();
