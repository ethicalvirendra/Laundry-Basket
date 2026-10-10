const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/WebDev/Projects/Laundry Basket/Web/backend/.env' });

const RateSchema = new mongoose.Schema({
    item: String,
    category: String,
    serviceType: String,
    price: Number
});

const Rate = mongoose.models.Rate || mongoose.model('Rate', RateSchema);

const newRates = [
    // HOUSEHOLD
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Blanket Single 1/2 Ply', price: 0 },
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Blanket Double 1/2 Ply', price: 0 },
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Quilt Single/Double', price: 0 },
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Duvet', price: 0 },
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Curtain Door/Window (Without Lining)', price: 0 },
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Curtain Door/Window (With Lining)', price: 0 },
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Bed Sheet Single/Double', price: 0 },
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Carpet /Sq Ft', price: 0 },
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Blind', price: 0 },

    // BAGS
    { serviceType: 'Dry Clean', category: 'Bags', item: 'Handbag', price: 0 },
    { serviceType: 'Dry Clean', category: 'Bags', item: 'Canvass/Jute/Cloth', price: 0 },
    { serviceType: 'Dry Clean', category: 'Bags', item: 'Handbag Leather', price: 0 },
    { serviceType: 'Dry Clean', category: 'Bags', item: 'Suit Case', price: 0 },
    { serviceType: 'Dry Clean', category: 'Bags', item: 'Wallet', price: 0 }
];

async function addRates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/laundry');
        console.log("Connected to MongoDB");

        let insertedCount = 0;
        for (const rate of newRates) {
            const existing = await Rate.findOne({ category: rate.category, item: rate.item, serviceType: rate.serviceType });
            if (!existing) {
                await Rate.create(rate);
                insertedCount++;
            }
        }
        
        console.log(`Inserted ${insertedCount} new rates.`);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

addRates();
