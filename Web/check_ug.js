require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const Rate = mongoose.model('Rate', new mongoose.Schema({}, { strict: false }));
    const r = await Rate.findOne({ item: { $regex: 'undergarment', $options: 'i' } });
    console.log(r);
    process.exit(0);
});
