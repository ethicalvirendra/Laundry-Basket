const mongoose = require('mongoose');
require('dotenv').config();

// Store Schema definition
const StoreSchema = new mongoose.Schema({
    id: String,
    name: String,
    branchCode: String,
    manager: String,
    location: String
});
const Store = mongoose.model('Store', StoreSchema);

// Inventory Schema definition
const InventorySchema = new mongoose.Schema({
    storeId: { type: String, default: 'GLOBAL' },
    item: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: 'kg' },
    lastUpdated: { type: String, default: () => new Date().toLocaleString() }
});
const Inventory = mongoose.model('Inventory', InventorySchema);

async function runMigration() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Fetch all stores
        const stores = await Store.find({});
        console.log("\n--- STORES FOUND ---");
        stores.forEach(s => console.log(`- [${s.id}] ${s.name} (Code: ${s.branchCode})`));

        // 2. Identify Ayodhya Nagar and Bawdiya Kalan
        const ayodhyaStore = stores.find(s => s.name.toLowerCase().includes('ayodhya') || s.branchCode.includes('AN') || s.id === 'LBST-854');
        const bawdiyaStore = stores.find(s => s.name.toLowerCase().includes('bawdiya') || s.name.toLowerCase().includes('bawadiya') || s.branchCode.includes('BK') || s.id === 'LBST-491');

        if (!ayodhyaStore) {
            console.error("❌ Error: Could not find Ayodhya Nagar store in the database.");
            return;
        }
        if (!bawdiyaStore) {
            console.error("❌ Error: Could not find Bawdiya Kalan store in the database.");
            return;
        }

        console.log(`\nFound Source Store (Ayodhya Nagar): ID = ${ayodhyaStore.id}, Name = ${ayodhyaStore.name}`);
        console.log(`Found Target Store (Bawdiya Kalan): ID = ${bawdiyaStore.id}, Name = ${bawdiyaStore.name}`);

        // 3. Fetch all inventory items for Ayodhya Nagar
        const ayodhyaInventory = await Inventory.find({ storeId: ayodhyaStore.id });
        console.log(`\nFound ${ayodhyaInventory.length} inventory items in Ayodhya Nagar:`);
        ayodhyaInventory.forEach(item => {
            console.log(`- ${item.item}: ${item.quantity} ${item.unit}`);
        });

        if (ayodhyaInventory.length === 0) {
            console.log("⚠️ No inventory items found to transfer. Exiting.");
            return;
        }

        console.log("\nStarting inventory transfer...");
        for (const item of ayodhyaInventory) {
            // Find if item already exists in Bawdiya Kalan
            const existingBawdiyaItem = await Inventory.findOne({ storeId: bawdiyaStore.id, item: item.item });
            
            let newQty = item.quantity;
            if (existingBawdiyaItem) {
                newQty += existingBawdiyaItem.quantity;
                console.log(`Updating existing item in Bawdiya Kalan: ${item.item} (${existingBawdiyaItem.quantity} -> ${newQty} ${item.unit})`);
            } else {
                console.log(`Creating new item in Bawdiya Kalan: ${item.item} (${item.quantity} ${item.unit})`);
            }

            // Update Bawdiya Kalan inventory
            await Inventory.findOneAndUpdate(
                { storeId: bawdiyaStore.id, item: item.item },
                { 
                    $set: { 
                        quantity: newQty, 
                        unit: item.unit, 
                        lastUpdated: new Date().toLocaleString() 
                    } 
                },
                { upsert: true, new: true }
            );

            // Remove/Delete from Ayodhya Nagar
            await Inventory.deleteOne({ _id: item._id });
            console.log(`Removed ${item.item} from Ayodhya Nagar inventory.`);
        }

        console.log("\n🎉 Inventory transfer completed successfully!");
        
        // Let's print final inventory for confirmation
        const finalBawdiyaInv = await Inventory.find({ storeId: bawdiyaStore.id });
        console.log("\n--- FINAL BAWDIYA KALAN INVENTORY ---");
        finalBawdiyaInv.forEach(item => {
            console.log(`- ${item.item}: ${item.quantity} ${item.unit}`);
        });

    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

runMigration();
