require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const RateSchema = new mongoose.Schema({ item: String, category: String, serviceType: String, price: Number }, { strict: false });
    const Rate = mongoose.model('Rate', RateSchema);
    
    // Check what rates exist for Wash & Iron
    const washAndIronRates = await Rate.find({ serviceType: 'Wash & Iron' });
    console.log("Existing Wash & Iron rates:");
    washAndIronRates.forEach(r => console.log(`- ${r.item} (Category: ${r.category}): ₹${r.price}`));
    
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
