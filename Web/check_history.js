require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const orders = await Order.find();
    
    orders.forEach(o => {
        let svcs = [];
        if (Array.isArray(o.services)) {
            svcs = o.services;
        } else if (typeof o.services === 'string') {
            svcs = o.services.split(',');
        } else if (Array.isArray(o.items)) {
            svcs = o.items.map(i => `${i.name || i.item} x${i.qty} (₹${i.amount})`);
        }
        
        svcs.forEach(s => {
            if (s.toLowerCase().includes('shirt') || s.toLowerCase().includes('lower')) {
                console.log(s);
            }
        });
    });
    
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
