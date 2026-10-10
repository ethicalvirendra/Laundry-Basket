const mongoose = require('mongoose');
require('dotenv').config();

async function fixCategories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const Rate = mongoose.models.Rate || mongoose.model('Rate', new mongoose.Schema({
            item: String,
            category: String,
            serviceType: String,
            price: Number
        }));

        // Fix "Mens" -> "Men"
        const mensUpdate = await Rate.updateMany({ category: 'Mens' }, { $set: { category: 'Men' } });
        console.log(`Updated ${mensUpdate.modifiedCount} Mens -> Men`);

        // Fix "Womens" -> "Women"
        const womensUpdate = await Rate.updateMany({ category: 'Womens' }, { $set: { category: 'Women' } });
        console.log(`Updated ${womensUpdate.modifiedCount} Womens -> Women`);

        // Fix "House Hold" -> "House Item"
        const householdUpdate = await Rate.updateMany({ category: 'House Hold' }, { $set: { category: 'House Item' } });
        console.log(`Updated ${householdUpdate.modifiedCount} House Hold -> House Item`);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

fixCategories();
