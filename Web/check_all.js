require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const Rate = mongoose.model('Rate', new mongoose.Schema({}, { strict: false }));
    const all = await Rate.find();
    
    // Just find any rate that contains "Shirt" anywhere
    const shirts = all.filter(r => (r.item && String(r.item).toLowerCase().includes('shirt')) || (r.serviceType && String(r.serviceType).toLowerCase().includes('shirt')));
    console.log("SHIRT RATES:");
    shirts.forEach(x => console.log(`${x.serviceType} | ${x.item} - ${x.price}`));
    
    // Just find any rate that contains "Lower" anywhere
    const lowers = all.filter(r => (r.item && String(r.item).toLowerCase().includes('lower')) || (r.serviceType && String(r.serviceType).toLowerCase().includes('lower')));
    console.log("\nLOWER RATES:");
    lowers.forEach(x => console.log(`${x.serviceType} | ${x.item} - ${x.price}`));
    
    process.exit(0);
});
