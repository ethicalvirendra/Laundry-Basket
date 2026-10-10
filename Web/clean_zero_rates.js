const mongoose = require('mongoose');
require('dotenv').config();

async function cleanZeroRates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const Rate = mongoose.models.Rate || mongoose.model('Rate', new mongoose.Schema({
            item: String,
            category: String,
            serviceType: String,
            price: Number
        }));

        // Delete all rates where price is exactly 0
        const result = await Rate.deleteMany({ price: 0 });
        console.log(`Successfully deleted ${result.deletedCount} placeholder items with ₹0 price.`);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

cleanZeroRates();
