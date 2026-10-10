require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const Rate = mongoose.model('Rate', new mongoose.Schema({}, { strict: false }));
    const match = await Rate.find({ item: { $regex: 'Shirt', $options: 'i' }, serviceType: { $regex: 'Wash & Iron', $options: 'i' } });
    console.log('Matches:');
    match.forEach(r => console.log(`- ${r.item} | ${r.serviceType} | ${r.category} | ${r.price}`));
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
