require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const orders = await Order.find().sort({ _id: -1 }).limit(5);
    orders.forEach(o => {
        console.log(`Order ID: ${o.orderId}, Subtotal: ${o.subtotal || o.total}, Items:`);
        if (Array.isArray(o.items)) {
            o.items.forEach(i => console.log(`  - ${i.name || i.item}: ${i.qty} x ${i.price} (amount: ${i.amount})`));
        } else {
            console.log(`  services: ${o.services}`);
        }
    });
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
