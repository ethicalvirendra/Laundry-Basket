require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const RateSchema = new mongoose.Schema({ item: String, category: String, serviceType: String, price: mongoose.Schema.Types.Mixed }, { strict: false });
    const Rate = mongoose.model('Rate', RateSchema);
    
    const all = await Rate.find({ serviceType: { $regex: 'Wash & Iron', $options: 'i' } });
    all.forEach(r => console.log(`${r.item} - ${r.price}`));
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
