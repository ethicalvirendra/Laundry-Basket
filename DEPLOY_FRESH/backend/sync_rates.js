const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: 'c:/WebDev/Projects/Laundry Basket/Web/backend/.env' });

const RateSchema = new mongoose.Schema({
    item: String,
    category: String,
    serviceType: String,
    price: Number
});
const Rate = mongoose.model('Rate', RateSchema);

async function syncRates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const data = fs.readFileSync('C:/Users/ThunderStorm ⛈️/Downloads/Master_Rate_List.csv', 'utf8');
        const lines = data.split('\n').filter(line => line.trim() !== '');
        
        // Skip header
        const rates = [];
        for (let i = 1; i < lines.length; i++) {
            const [service, category, item, price] = lines[i].split(',');
            if (service && category && item && price) {
                rates.push({
                    serviceType: service.trim(),
                    category: category.trim(),
                    item: item.trim(),
                    price: parseFloat(price.trim()) || 0
                });
            }
        }

        console.log(`Parsed ${rates.length} rates. Wiping and uploading...`);
        await Rate.deleteMany({});
        await Rate.insertMany(rates);
        console.log("Sync Complete!");
        process.exit(0);
    } catch (err) {
        console.error("Sync Error:", err);
        process.exit(1);
    }
}

syncRates();
