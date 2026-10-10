const mongoose = require('mongoose');
require('dotenv').config();

async function restoreBags() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const Rate = mongoose.models.Rate || mongoose.model('Rate', new mongoose.Schema({
            item: String,
            category: String,
            serviceType: String,
            price: Number
        }));

        const bags = [
            { serviceType: 'Dry Clean', category: 'Bags', item: 'Handbag', price: 0 },
            { serviceType: 'Dry Clean', category: 'Bags', item: 'Canvass/Jute/Cloth', price: 0 },
            { serviceType: 'Dry Clean', category: 'Bags', item: 'Handbag Leather', price: 0 },
            { serviceType: 'Dry Clean', category: 'Bags', item: 'Suit Case', price: 0 },
            { serviceType: 'Dry Clean', category: 'Bags', item: 'Wallet', price: 0 }
        ];

        let restoredCount = 0;
        for (const bag of bags) {
            const existing = await Rate.findOne({ category: bag.category, item: bag.item, serviceType: bag.serviceType });
            if (!existing) {
                await Rate.create(bag);
                restoredCount++;
            }
        }

        console.log(`Successfully restored ${restoredCount} Bag items!`);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

restoreBags();
