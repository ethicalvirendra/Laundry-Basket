require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const RateSchema = new mongoose.Schema({}, { strict: false });
    const Rate = mongoose.model('Rate', RateSchema);
    
    const all = await Rate.find();
    const match = all.filter(r => String(r.price).includes('42'));
    console.log('Matches with 42:');
    match.forEach(r => console.log(`${r.item} | ${r.serviceType} | ${r.category} | ${r.price}`));
    
    const match32 = all.filter(r => String(r.price).includes('32'));
    console.log('\nMatches with 32:');
    match32.forEach(r => console.log(`${r.item} | ${r.serviceType} | ${r.category} | ${r.price}`));
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
