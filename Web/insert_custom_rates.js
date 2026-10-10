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
    // Kurta Combo
    { serviceType: 'Wash & Iron', category: 'Womens', item: 'Kurta Combo (with Salwar/Plazo/Legging/Trouser)', price: 30 },
    { serviceType: 'Steam Iron', category: 'Womens', item: 'Kurta Combo (with Salwar/Plazo/Legging/Trouser)', price: 16 },
    { serviceType: 'Wash', category: 'Womens', item: 'Kurta Combo (with Salwar/Plazo/Legging/Trouser)', price: 20 },

    // Bed sheet
    { serviceType: 'Iron', category: 'House Hold', item: 'Bed Sheet', price: 12 },
    { serviceType: 'Wash', category: 'House Hold', item: 'Bed Sheet', price: 10 },
    { serviceType: 'Dry Clean', category: 'House Hold', item: 'Bed Sheet', price: 60 },

    // Carpet
    { serviceType: 'Dry Clean', category: 'House Hold', item: 'Carpet (per sqft)', price: 20 },
    { serviceType: 'Wash', category: 'House Hold', item: 'Carpet (per sqft)', price: 10 },

    // Pillow Cover
    { serviceType: 'Wash', category: 'House Hold', item: 'Pillow Cover', price: 5 },
    { serviceType: 'Wash & Iron', category: 'House Hold', item: 'Pillow Cover', price: 8 },
    { serviceType: 'Dry Clean', category: 'House Hold', item: 'Pillow Cover', price: 25 },

    // Saree (with Blouse)
    { serviceType: 'Wash', category: 'Womens', item: 'Saree (with Blouse)', price: 30 },
    { serviceType: 'Iron', category: 'Womens', item: 'Saree (with Blouse)', price: 40 },
    { serviceType: 'Dry Clean', category: 'Womens', item: 'Saree (with Blouse)', price: 150 },
    { serviceType: 'Wash & Roll Press', category: 'Womens', item: 'Saree (with Blouse)', price: 90 },
    { serviceType: 'Roll Press', category: 'Womens', item: 'Saree (with Blouse)', price: 80 }
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
        
        console.log(`Inserted/Updated ${insertedCount} custom rates.`);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

addRates();
