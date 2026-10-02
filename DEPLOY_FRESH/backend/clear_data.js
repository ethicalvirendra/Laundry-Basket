const mongoose = require('mongoose');
require('dotenv').config();

async function clearTestData() {
    console.log("🧹 Starting data cleanup...");
    
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        // Define schemas briefly for deletion
        const Order = mongoose.model('Order', new mongoose.Schema({}));
        const Ticket = mongoose.model('Ticket', new mongoose.Schema({}));
        const Counter = mongoose.model('Counter', new mongoose.Schema({ id: String, seq: Number }));

        // 1. Delete all Orders
        const orderRes = await Order.deleteMany({});
        console.log(`🗑️ Deleted ${orderRes.deletedCount} orders.`);

        // 2. Delete all Tickets
        const ticketRes = await Ticket.deleteMany({});
        console.log(`🗑️ Deleted ${ticketRes.deletedCount} tickets.`);

        // 3. Reset ID Counters (so first order is 10001)
        const counterRes = await Counter.updateMany({}, { seq: 0 });
        console.log(`🔄 Reset ${counterRes.modifiedCount} ID counters.`);

        console.log("\n✨ Production database is now CLEAN and ready for deployment.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Cleanup failed:", err);
        process.exit(1);
    }
}

clearTestData();
