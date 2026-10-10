const mongoose = require('mongoose');
require('dotenv').config();

const itemsToSeed = [
    // Page 1 (Items 1 - 27)
    { item: "Laptop", quantity: 1, unit: "Pcs" },
    { item: "Counter", quantity: 1, unit: "Pcs" },
    { item: "Computer", quantity: 1, unit: "Pcs" },
    { item: "Mouse", quantity: 1, unit: "Pcs" },
    { item: "Basket", quantity: 22, unit: "Pcs" },
    { item: "Correction Pen", quantity: 7, unit: "Pcs" },
    { item: "Tag Machine", quantity: 1, unit: "Pcs" },
    { item: "Pen", quantity: 15, unit: "Pcs" },
    { item: "Printed Roll", quantity: 1, unit: "Roll" },
    { item: "Paper Roll", quantity: 1, unit: "Roll" },
    { item: "Revive", quantity: 2, unit: "Bottle" },
    { item: "Vanish Oxi Action", quantity: 1, unit: "Bottle" },
    { item: "Vim", quantity: 1, unit: "Bottle" },
    { item: "Chandra Clothes Brush", quantity: 5, unit: "Pcs" },
    { item: "Comfort Fabric Conditioner", quantity: 1, unit: "Bottle" },
    { item: "Wonder", quantity: 12, unit: "Pcs" },
    { item: "Stain Off", quantity: 1, unit: "Bottle" },
    { item: "Thermal Printed", quantity: 2, unit: "Roll" },
    { item: "Stain Out (Uniwax)", quantity: 1, unit: "Bottle" },
    { item: "SAMS", quantity: 1, unit: "Pcs" },
    { item: "Ariel Power Gel", quantity: 1, unit: "Bottle" },
    { item: "Premia", quantity: 4, unit: "Pcs" },
    { item: "Sticky Notes", quantity: 2, unit: "Pkt" },
    { item: "Highlighters", quantity: 2, unit: "Pcs" },
    { item: "White Board (Marker Pen)", quantity: 1, unit: "Pcs" },
    { item: "Hand Pochha", quantity: 1, unit: "Pcs" },
    { item: "Tester", quantity: 1, unit: "Pcs" },

    // Page 2 (Items 28 - 55)
    { item: "Plug", quantity: 1, unit: "Pcs" },
    { item: "Cotton Buds", quantity: 3, unit: "Pkt" },
    { item: "Register Entry", quantity: 1, unit: "Pcs" },
    { item: "Bill Register", quantity: 3, unit: "Pcs" },
    { item: "Voucher Pad", quantity: 16, unit: "Pcs" },
    { item: "Glass Business Card", quantity: 5, unit: "Box" },
    { item: "Express Shine", quantity: 2, unit: "Pcs" },
    { item: "Agri", quantity: 1, unit: "Pcs" },
    { item: "Staples", quantity: 2, unit: "Pkt" },
    { item: "Mode Light Power", quantity: 1, unit: "Pcs" },
    { item: "Paper Tape", quantity: 1, unit: "Roll" },
    { item: "Chai Induction", quantity: 2, unit: "Pcs" },
    { item: "Teflon Shoe", quantity: 1, unit: "Pcs" },
    { item: "Eraser", quantity: 2, unit: "Pcs" },
    { item: "Pencils", quantity: 10, unit: "Pcs" },
    { item: "Business Card", quantity: 1, unit: "Box" },
    { item: "Calculator", quantity: 1, unit: "Pcs" },
    { item: "Tag Pin", quantity: 1, unit: "Pkt" },
    { item: "Kapde Tag Karne Ki Machine", quantity: 1, unit: "Pcs" },
    { item: "Cherry (Shoe Polish)", quantity: 3, unit: "Pcs" },
    { item: "White Cooking Vinegar", quantity: 1, unit: "Bottle" },
    { item: "Scale", quantity: 2, unit: "Pcs" },
    { item: "Packing Tape", quantity: 1, unit: "Roll" },
    { item: "Cloth Clips", quantity: 12, unit: "Pcs" },
    { item: "Masking Tape", quantity: 1, unit: "Roll" },
    { item: "Sofa Cleaner", quantity: 1, unit: "Bottle" },
    { item: "Oxy", quantity: 1, unit: "Bottle" },
    { item: "Tape", quantity: 7, unit: "Roll" },

    // Page 3 (Items 56 - 72)
    { item: "Raj Sabun", quantity: 5, unit: "Pcs" },
    { item: "Tetra", quantity: 21, unit: "Pcs" },
    { item: "Tissue", quantity: 1, unit: "Pkt" },
    { item: "Polythene / Polybag", quantity: 3, unit: "Pkt" },
    { item: "Epson POS Roll", quantity: 1, unit: "Roll" },
    { item: "Stapler Pin", quantity: 2, unit: "Pkt" },
    { item: "Avister Tag Pin", quantity: 2, unit: "Pkt" },
    { item: "Kainchi (Scissors)", quantity: 6, unit: "Pcs" },
    { item: "Cup", quantity: 1, unit: "Set" },
    { item: "Channi (Strainer)", quantity: 3, unit: "Pcs" },
    { item: "Tray", quantity: 1, unit: "Pcs" },
    { item: "Press (Iron)", quantity: 2, unit: "Pcs" },
    { item: "Table", quantity: 1, unit: "Pcs" },
    { item: "Table Seat", quantity: 2, unit: "Pcs" },
    { item: "Chair", quantity: 1, unit: "Pcs" },
    { item: "Haipo (Hypo)", quantity: 1, unit: "Can" },
    { item: "Intex Machine", quantity: 1, unit: "Pcs" }
];

async function seed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected");

        const InventorySchema = new mongoose.Schema({
            storeId: { type: String, default: 'GLOBAL' },
            item: { type: String, required: true },
            quantity: { type: Number, default: 0 },
            unit: { type: String, default: 'Pcs' },
            lastUpdated: { type: String, default: () => new Date().toLocaleString() }
        });

        const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);

        const targetStores = ['LBBPL', 'GLOBAL'];
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        for (const storeId of targetStores) {
            console.log(`\n--- Seeding inventory for Store [${storeId}] ---`);
            for (const entry of itemsToSeed) {
                await Inventory.findOneAndUpdate(
                    { storeId, item: entry.item },
                    {
                        $set: {
                            quantity: entry.quantity,
                            unit: entry.unit,
                            lastUpdated: timestamp
                        }
                    },
                    { upsert: true, new: true }
                );
            }
            console.log(`✅ Upserted ${itemsToSeed.length} inventory items into storeId: ${storeId}`);
        }

        const totalInDb = await Inventory.countDocuments();
        console.log(`\n🎉 Total Inventory records in DB: ${totalInDb}`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding Error:", err);
        process.exit(1);
    }
}

seed();
