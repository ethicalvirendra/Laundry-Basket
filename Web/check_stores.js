const mongoose = require('mongoose');
require('dotenv').config();

const StoreSchema = new mongoose.Schema({
    id: String,
    name: String,
    branchCode: String,
    manager: String,
    password: { type: String },
});
const Store = mongoose.model('Store', StoreSchema);

async function checkStores() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const stores = await Store.find();
        console.log(JSON.stringify(stores, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
checkStores();
