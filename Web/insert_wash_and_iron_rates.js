const mongoose = require('mongoose');
require('dotenv').config();

const RateSchema = new mongoose.Schema({
    item: String,
    category: String,
    serviceType: String,
    price: Number
});

const Rate = mongoose.models.Rate || mongoose.model('Rate', RateSchema);

const newRates = [
    // MENS
    { serviceType: 'Wash & Iron', category: 'Mens', item: 'Shirt', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Mens', item: 'T-Shirt', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Mens', item: 'Trouser', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Mens', item: 'Jeans/Trouser Heavy', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Mens', item: 'Kurta', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Mens', item: 'Dhoti', price: 50 },
    { serviceType: 'Wash & Iron', category: 'Mens', item: 'Pajama', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Mens', item: 'Sweater', price: 60 },
    { serviceType: 'Wash & Iron', category: 'Mens', item: 'Undergarment', price: 20 },

    // WOMENS
    { serviceType: 'Wash & Iron', category: 'Womens', item: 'Salwar/Leggings', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Womens', item: 'Kurta Plain', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Womens', item: 'Dupatta Fancy', price: 30 },

    // HOUSE HOLD
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Bed Sheet Single', price: 25 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Bed Sheet Double', price: 30 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Quilt Cover Single', price: 60 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Quilt Cover Double', price: 80 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Cushion', price: 30 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Cushion Cover', price: 20 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Hand Towel', price: 12 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Towel Big', price: 20 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Curtains', price: 40 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Bathrobe', price: 40 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Mat', price: 30 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Table Mat', price: 30 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Table Cover', price: 30 }
];

async function addRates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        let insertedCount = 0;
        for (const rate of newRates) {
            const existing = await Rate.findOne({ category: rate.category, item: rate.item, serviceType: rate.serviceType });
            if (!existing) {
                await Rate.create(rate);
                insertedCount++;
            } else if (existing.price !== rate.price) {
                existing.price = rate.price;
                await existing.save();
                insertedCount++;
            }
        }
        
        console.log(`Inserted/Updated ${insertedCount} Wash & Iron rates.`);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

addRates();
