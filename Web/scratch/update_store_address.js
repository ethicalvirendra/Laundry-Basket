const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const StoreSchema = new mongoose.Schema({
    id: String,
    name: String,
    location: String
});
const Store = mongoose.model('Store', StoreSchema);

async function run() {
    if (!process.env.MONGODB_URI) {
        console.error("❌ MONGODB_URI is not defined in the environment!");
        process.exit(1);
    }
    
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        const targetId = 'LBST-491';
        const newAddress = 'A56 Gujrati Colony, Bawadiya Kalan, Bhopal, Madhya Pradesh 462026';

        console.log(`Updating store ${targetId} location to: "${newAddress}"...`);
        const result = await Store.updateOne(
            { id: targetId },
            { $set: { location: newAddress } }
        );

        if (result.matchedCount === 0) {
            console.log("⚠️ Store with ID 'LBST-491' was not found!");
        } else {
            console.log(`🎉 Store location updated successfully! Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        }
        
    } catch (err) {
        console.error("❌ Database update failed:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

run();
