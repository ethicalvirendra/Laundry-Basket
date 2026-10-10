const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Inventory = mongoose.model('Inventory', new mongoose.Schema({
            storeId: String,
            item: String,
            quantity: Number,
            unit: String,
            lastUpdated: String
        }));

        const items = await Inventory.find({});
        console.log("Current Inventory items:", JSON.stringify(items, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
main();
