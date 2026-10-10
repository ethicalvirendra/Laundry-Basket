const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:\\Projects\\Laundry Basket\\Web\\.env' });

const OrderSchema = new mongoose.Schema({
    id: { type: String, unique: true }, 
    storeId: String,
    name: String,
    phone: String,
    address: { type: String, default: 'Home Delivery' },
    services: [String],
    total: Number,
    commission: Number,
    netEarning: Number,
    status: { type: String, default: 'Pending' },
    paymentStatus: { type: String, default: 'Pending' }, 
    paymentMode: { type: String, default: null }, 
    source: { type: String, default: 'Web' }, 
    timestamp: { type: String, default: () => new Date().toLocaleString() },
    events: [{ status: String, time: { type: String, default: () => new Date().toLocaleTimeString() } }],
    assignedRiderId: { type: String, default: null },
    pickupCode: { type: String, default: null },
    deliveryCode: { type: String, default: null },
    slot: { type: String, default: null },
    tipAmount: { type: Number, default: 0 },
    incentive: { type: Number, default: 0 },
    customer_id: String,
    customer_name: String,
    mobile_number: String,
    order_date: String,
    items_ordered: String,
    quantity: Number,
    service_type: String,
    pickup_person: String,
    delivery_person: String,
    delivery_status: String,
    delivery_date: String,
    delivery_mode: String,
    payment_status: String,
    payment_mode: String,
    received_amount: Number,
    pending_amount: Number,
    received_date: String,
    received_month: String,
    total_days_aging: Number,
    pending_payment_days: Number,
    payment_risk: String,
    cx_type: String
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const filter = { id: 'LBBPLBAN000377' };
        const orders = await Order.find(filter).select('-events -__v').lean();
        console.log("Query count:", orders.length);
        if (orders.length > 0) {
            console.log("has amount_estimate_details:", 'amount_estimate_details' in orders[0]);
            console.log("keys of the retrieved object:", Object.keys(orders[0]));
        } else {
            console.log("No orders found");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
