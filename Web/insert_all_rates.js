const mongoose = require('mongoose');
require('dotenv').config();

const RateSchema = new mongoose.Schema({
    item: String,
    category: String,
    serviceType: String,
    price: Number
});

const Rate = mongoose.models.Rate || mongoose.model('Rate', RateSchema);

const allRates = [
    // === MENS CATEGORY ===
    { serviceType: 'Dry Clean', category: 'Men', item: 'Shirt', price: 50 },
    { serviceType: 'Wash & Iron', category: 'Men', item: 'Shirt', price: 20 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Shirt', price: 10 },
    { serviceType: 'Iron', category: 'Men', item: 'Shirt', price: 8 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'T-Shirt', price: 50 },
    { serviceType: 'Wash & Iron', category: 'Men', item: 'T-Shirt', price: 20 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'T-Shirt', price: 10 },
    { serviceType: 'Iron', category: 'Men', item: 'T-Shirt', price: 8 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Trouser', price: 50 },
    { serviceType: 'Wash & Iron', category: 'Men', item: 'Trouser', price: 20 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Trouser', price: 10 },
    { serviceType: 'Iron', category: 'Men', item: 'Trouser', price: 8 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Jeans/Trouser Heavy', price: 50 },
    { serviceType: 'Wash & Iron', category: 'Men', item: 'Jeans/Trouser Heavy', price: 20 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Jeans/Trouser Heavy', price: 15 },
    { serviceType: 'Iron', category: 'Men', item: 'Jeans/Trouser Heavy', price: 12 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Kurta', price: 50 },
    { serviceType: 'Wash & Iron', category: 'Men', item: 'Kurta', price: 20 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Kurta', price: 10 },
    { serviceType: 'Iron', category: 'Men', item: 'Kurta', price: 8 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Coat/Blazer', price: 80 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Coat/Blazer', price: 70 },
    { serviceType: 'Iron', category: 'Men', item: 'Coat/Blazer', price: 60 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Coat 2 Pcs', price: 150 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Coat 2 Pcs', price: 120 },
    { serviceType: 'Iron', category: 'Men', item: 'Coat 2 Pcs', price: 100 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Coat 3 Pcs', price: 200 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Coat 3 Pcs', price: 150 },
    { serviceType: 'Iron', category: 'Men', item: 'Coat 3 Pcs', price: 120 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Dhoti', price: 100 },
    { serviceType: 'Wash & Iron', category: 'Men', item: 'Dhoti', price: 50 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Dhoti', price: 25 },
    { serviceType: 'Iron', category: 'Men', item: 'Dhoti', price: 20 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Pajama', price: 50 },
    { serviceType: 'Wash & Iron', category: 'Men', item: 'Pajama', price: 20 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Pajama', price: 10 },
    { serviceType: 'Iron', category: 'Men', item: 'Pajama', price: 8 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Sherwani', price: 200 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Sherwani', price: 120 },
    { serviceType: 'Iron', category: 'Men', item: 'Sherwani', price: 80 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Shorts', price: 40 },
    { serviceType: 'Wash & Iron', category: 'Men', item: 'Shorts', price: 15 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Shorts', price: 10 },
    { serviceType: 'Iron', category: 'Men', item: 'Shorts', price: 8 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Sweater', price: 100 },
    { serviceType: 'Wash & Iron', category: 'Men', item: 'Sweater', price: 60 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Sweater', price: 25 },
    { serviceType: 'Iron', category: 'Men', item: 'Sweater', price: 20 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Leather Jacket Polish', price: 200 },
    { serviceType: 'Dry Clean', category: 'Men', item: 'Rexine Jacket Polish', price: 200 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Jacket', price: 180 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Jacket', price: 30 },
    { serviceType: 'Iron', category: 'Men', item: 'Jacket', price: 25 },

    { serviceType: 'Dry Clean', category: 'Men', item: 'Undergarment', price: 30 },
    { serviceType: 'Wash & Iron', category: 'Men', item: 'Undergarment', price: 20 },
    { serviceType: 'Steam Iron', category: 'Men', item: 'Undergarment', price: 10 },
    { serviceType: 'Iron', category: 'Men', item: 'Undergarment', price: 8 },

    // === WOMENS CATEGORY ===
    { serviceType: 'Dry Clean', category: 'Women', item: 'Salwar/Leggines', price: 50 },
    { serviceType: 'Wash & Iron', category: 'Women', item: 'Salwar/Leggines', price: 20 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Salwar/Leggines', price: 10 },
    { serviceType: 'Iron', category: 'Women', item: 'Salwar/Leggines', price: 8 },

    { serviceType: 'Dry Clean', category: 'Women', item: 'Kurta Plain', price: 50 },
    { serviceType: 'Wash & Iron', category: 'Women', item: 'Kurta Plain', price: 20 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Kurta Plain', price: 10 },
    { serviceType: 'Iron', category: 'Women', item: 'Kurta Plain', price: 8 },

    { serviceType: 'Dry Clean', category: 'Women', item: 'Suit Heavy', price: 150 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Suit Heavy', price: 100 },
    { serviceType: 'Iron', category: 'Women', item: 'Suit Heavy', price: 80 },

    { serviceType: 'Dry Clean', category: 'Women', item: 'Saree', price: 180 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Saree', price: 70 },
    { serviceType: 'Iron', category: 'Women', item: 'Saree', price: 50 },

    { serviceType: 'Dry Clean', category: 'Women', item: 'Saree Silk', price: 200 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Saree Silk', price: 80 },
    { serviceType: 'Iron', category: 'Women', item: 'Saree Silk', price: 60 },

    { serviceType: 'Dry Clean', category: 'Women', item: 'Lehanga Heavy', price: 250 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Lehanga Heavy', price: 120 },
    { serviceType: 'Iron', category: 'Women', item: 'Lehanga Heavy', price: 100 },

    { serviceType: 'Dry Clean', category: 'Women', item: 'Dupatta Fancy', price: 50 },
    { serviceType: 'Wash & Iron', category: 'Women', item: 'Dupatta Fancy', price: 30 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Dupatta Fancy', price: 20 },
    { serviceType: 'Iron', category: 'Women', item: 'Dupatta Fancy', price: 15 },

    { serviceType: 'Dry Clean', category: 'Women', item: 'Blouse Fancy', price: 50 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Blouse Fancy', price: 15 },
    { serviceType: 'Iron', category: 'Women', item: 'Blouse Fancy', price: 12 },

    { serviceType: 'Dry Clean', category: 'Women', item: 'Skirt', price: 80 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Skirt', price: 30 },
    { serviceType: 'Iron', category: 'Women', item: 'Skirt', price: 25 },

    { serviceType: 'Dry Clean', category: 'Women', item: 'Jacket Denim', price: 100 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Jacket Denim', price: 30 },
    { serviceType: 'Iron', category: 'Women', item: 'Jacket Denim', price: 25 },

    { serviceType: 'Dry Clean', category: 'Women', item: 'Shawl', price: 90 },
    { serviceType: 'Steam Iron', category: 'Women', item: 'Shawl', price: 30 },
    { serviceType: 'Iron', category: 'Women', item: 'Shawl', price: 25 },

    // === HOUSE HOLD CATEGORY ===
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Bed Sheet Single', price: 60 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Bed Sheet Single', price: 25 },
    { serviceType: 'Steam Iron', category: 'House Item', item: 'Bed Sheet Single', price: 15 },
    { serviceType: 'Iron', category: 'House Item', item: 'Bed Sheet Single', price: 12 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Bed Sheet Double', price: 80 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Bed Sheet Double', price: 30 },
    { serviceType: 'Steam Iron', category: 'House Item', item: 'Bed Sheet Double', price: 15 },
    { serviceType: 'Iron', category: 'House Item', item: 'Bed Sheet Double', price: 12 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Blanket Single', price: 250 },
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Blanket Double', price: 300 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Quilt Cover Single', price: 80 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Quilt Cover Single', price: 60 },
    { serviceType: 'Steam Iron', category: 'House Item', item: 'Quilt Cover Single', price: 20 },
    { serviceType: 'Iron', category: 'House Item', item: 'Quilt Cover Single', price: 15 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Quilt Cover Double', price: 120 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Quilt Cover Double', price: 80 },
    { serviceType: 'Steam Iron', category: 'House Item', item: 'Quilt Cover Double', price: 20 },
    { serviceType: 'Iron', category: 'House Item', item: 'Quilt Cover Double', price: 15 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Pillow', price: 100 },
    { serviceType: 'Steam Iron', category: 'House Item', item: 'Pillow', price: 10 },
    { serviceType: 'Iron', category: 'House Item', item: 'Pillow', price: 10 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Cushion', price: 50 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Cushion', price: 30 },
    { serviceType: 'Steam Iron', category: 'House Item', item: 'Cushion', price: 10 },
    { serviceType: 'Iron', category: 'House Item', item: 'Cushion', price: 8 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Cushion Cover', price: 30 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Cushion Cover', price: 20 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Hand Towel', price: 20 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Hand Towel', price: 12 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Towel Big', price: 40 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Towel Big', price: 20 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Curtains', price: 80 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Curtains', price: 40 },
    { serviceType: 'Steam Iron', category: 'House Item', item: 'Curtains', price: 30 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Bathrobe', price: 60 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Bathrobe', price: 40 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Mat', price: 40 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Mat', price: 30 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Table Mat', price: 40 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Table Mat', price: 30 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Table Cover', price: 40 },
    { serviceType: 'Wash & Iron', category: 'House Item', item: 'Table Cover', price: 30 },
    { serviceType: 'Steam Iron', category: 'House Item', item: 'Table Cover', price: 15 },

    { serviceType: 'Dry Clean', category: 'House Item', item: 'Carpet', price: 400 },
    { serviceType: 'Dry Clean', category: 'House Item', item: 'Shoe', price: 250 },

    // === HOTEL LINEN CATEGORY ===
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Bed Sheet (Single)', price: 8 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Bed Sheet (Double/King)', price: 15 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Pillow Cover', price: 7 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Duvet Cover', price: 25 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Bed Cover', price: 25 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Runner', price: 8 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Frill', price: 15 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Bath Towel', price: 10 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Hand Towel', price: 10 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Face Towel', price: 8 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Bath Mat', price: 10 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Table Cloth', price: 10 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Cloth Napkin', price: 8 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Table Runner', price: 8 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Chair Cover', price: 15 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Chef Coat', price: 25 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Staff Uniform', price: 25 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Apron', price: 15 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Blanket (Single)', price: 150 },
    { serviceType: 'Wash & Iron', category: 'Hotel Linen', item: 'Blanket (Double)', price: 300 },

    // === HOTEL GUEST LAUNDRY CATEGORY ===
    { serviceType: 'Wash & Iron', category: 'Hotel Guest Laundry', item: 'Shirt', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Hotel Guest Laundry', item: 'Pant', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Hotel Guest Laundry', item: 'T-Shirt', price: 15 },
    { serviceType: 'Wash & Iron', category: 'Hotel Guest Laundry', item: 'Jeans', price: 20 },
    { serviceType: 'Wash & Iron', category: 'Hotel Guest Laundry', item: 'Shorts', price: 15 },
    { serviceType: 'Wash & Iron', category: 'Hotel Guest Laundry', item: 'Track Pant', price: 15 },
    { serviceType: 'Wash & Iron', category: 'Hotel Guest Laundry', item: 'Vest / Underwear', price: 15 },
    { serviceType: 'Wash & Iron', category: 'Hotel Guest Laundry', item: 'Handkerchief', price: 10 },

    // === LAUNDRY BY KG CATEGORY ===
    { serviceType: 'Kg', category: 'Laundry by Kg', item: 'Wash', price: 60 },
    { serviceType: 'Kg', category: 'Laundry by Kg', item: 'Wash + Iron', price: 70 }
];

async function addRates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        let insertedCount = 0;
        let updatedCount = 0;
        for (const rate of allRates) {
            const existing = await Rate.findOne({ category: rate.category, item: rate.item, serviceType: rate.serviceType });
            if (!existing) {
                await Rate.create(rate);
                insertedCount++;
            } else if (existing.price !== rate.price) {
                existing.price = rate.price;
                await existing.save();
                updatedCount++;
            }
        }
        
        console.log(`Inserted ${insertedCount} and updated ${updatedCount} universal rates.`);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

addRates();
