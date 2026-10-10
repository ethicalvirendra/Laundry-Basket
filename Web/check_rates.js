require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const RateSchema = new mongoose.Schema({ item: String, category: String, serviceType: String, price: Number }, { strict: false });
    const Rate = mongoose.model('Rate', RateSchema);
    
    const rates = await Rate.find({ price: 42 });
    console.log('\nRates with price 42:');
    rates.forEach(r => console.log(`- ${r.item} | ${r.serviceType} | ${r.category} | ${r.price}`));
    
    const rates32 = await Rate.find({ price: 32 });
    console.log('\nRates with price 32:');
    rates32.forEach(r => console.log(`- ${r.item} | ${r.serviceType} | ${r.category} | ${r.price}`));
    
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
