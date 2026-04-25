const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the root directory (parent of backend)
app.use(express.static(path.join(__dirname, '..')));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to Laundry Basket MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Database Schemas ---

// 1. Order Schema
const OrderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    storeId: String,
    name: String,
    phone: String,
    services: String,
    itemSummary: String,
    total: Number,
    address: String,
    status: { type: String, default: 'Pending' },
    timestamp: { type: String, default: () => new Date().toLocaleString() }
});
const Order = mongoose.model('Order', OrderSchema);

// 2. Store Schema
const StoreSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: String,
    address: String,
    mapLink: String,
    user: String,
    pass: String,
    approved: { type: Boolean, default: false },
    nextOrderId: { type: Number, default: 1 }
});
const Store = mongoose.model('Store', StoreSchema);

// --- Middleware: Verify JWT ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized access' });
        req.user = decoded;
        next();
    });
};

// --- API Routes ---

// AUTH: Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Check if it's the Global Admin (defined in .env) - Do this BEFORE DB lookup
        if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
            const token = jwt.sign({ id: 'admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token, role: 'admin', name: 'Master Admin' });
        }

        // Check if DB is connected before lookup
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database connection is currently down. Only the Admin can login.' });
        }

        // Check for Store Manager
        const store = await Store.findOne({ user: username });
        if (!store) return res.status(401).json({ error: 'User not found' });

        // For simplicity in this demo, we check plain text if bcrypt fails (or just use bcrypt)
        const isMatch = await bcrypt.compare(password, store.pass).catch(() => password === store.pass);
        
        if (isMatch) {
            if (!store.approved) {
                return res.status(403).json({ error: 'Your account is pending admin approval' });
            }
            const token = jwt.sign({ id: store.id, role: 'manager' }, process.env.JWT_SECRET, { expiresIn: '8h' });
            res.json({ token, role: 'manager', storeId: store.id, name: store.name });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// AUTH: Customer OTP Request (MSG91 Integration)
app.post('/api/otp/request', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    
    // In demo/test mode, use 9999999999 to skip real SMS
    if (phone === '9999999999') {
        return res.json({ message: 'Static OTP enabled', otp: '1111' });
    }

    try {
        const response = await axios.get(
            `https://api.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=91${phone}&authkey=${process.env.MSG91_AUTH_KEY}`
        );
        res.json({ message: 'OTP sent successfully', data: response.data });
    } catch (err) {
        console.error("MSG91 Send Error:", err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to send OTP via SMS' });
    }
});

// AUTH: Customer OTP Verify (MSG91 Integration)
app.post('/api/otp/verify', async (req, res) => {
    const { phone, otp, name } = req.body;
    
    // Static verification for test
    if (phone === '9999999999' && otp === '1111') {
        const token = jwt.sign({ id: phone, role: 'customer', name }, process.env.JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, name, phone });
    }

    try {
        const response = await axios.get(
            `https://api.msg91.com/api/v5/otp/verify?mobile=91${phone}&otp=${otp}&authkey=${process.env.MSG91_AUTH_KEY}`
        );

        if (response.data.type === 'success') {
            const token = jwt.sign({ id: phone, role: 'customer', name }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, name, phone });
        } else {
            res.status(401).json({ error: 'Invalid OTP' });
        }
    } catch (err) {
        console.error("MSG91 Verify Error:", err.response?.data || err.message);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});

// GET: All Orders (Admin only)
app.get('/api/orders', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    try {
        const orders = await Order.find().sort({ _id: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Orders by Store (Manager or Admin)
app.get('/api/orders/store/:storeId', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.id !== req.params.storeId) {
        return res.status(403).json({ error: 'Access denied to this store' });
    }
    try {
        const orders = await Order.find({ storeId: req.params.storeId }).sort({ _id: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Create New Order
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.status(201).json(newOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT: Update Order Status (Authorized only)
app.put('/api/orders/:id', verifyToken, async (req, res) => {
    try {
        // Logic: Managers can only update orders for their store
        const order = await Order.findOne({ id: req.params.id });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        if (req.user.role !== 'admin' && req.user.id !== order.storeId) {
            return res.status(403).json({ error: 'Not authorized to update this order' });
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { id: req.params.id },
            { status: req.body.status },
            { new: true }
        );
        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET: All Stores (Admin only)
app.get('/api/stores', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    try {
        const stores = await Store.find();
        res.json(stores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Sync Store Counter
app.put('/api/stores/:id/counter', async (req, res) => {
    try {
        const updatedStore = await Store.findOneAndUpdate(
            { id: req.params.id },
            { nextOrderId: req.body.nextOrderId },
            { new: true }
        );
        res.json(updatedStore);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST: Seed Database
app.post('/api/seed', async (req, res) => {
    try {
        const stores = req.body;
        await Store.deleteMany({}); // Wipe existing for fresh seed
        await Store.insertMany(stores);
        res.json({ message: 'Database seeded successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend Server running on port ${PORT}`));
