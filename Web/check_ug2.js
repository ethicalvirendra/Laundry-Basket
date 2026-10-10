require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Rate = mongoose.model('Rate', new mongoose.Schema({}, { strict: false }));
    const all = await Rate.find({ item: { $regex: 'undergarment', $options: 'i' }});
    all.forEach(x => console.log(`${x.serviceType} | ${x.item} - ${x.price}`));
    process.exit(0);
});
