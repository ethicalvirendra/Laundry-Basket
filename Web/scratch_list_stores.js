const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Store = mongoose.model('Store', new mongoose.Schema({ id: String, name: String, branchCode: String }));
        const stores = await Store.find({});
        console.log("Stores found:", JSON.stringify(stores, null, 2));

        const Inventory = mongoose.model('Inventory', new mongoose.Schema({
            storeId: String,
            item: String,
            quantity: Number,
            unit: String,
            lastUpdated: String
        }));

        const inventory = await Inventory.find({});
        console.log(`Current total inventory items count: ${inventory.length}`);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();
