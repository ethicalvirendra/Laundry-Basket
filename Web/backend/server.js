const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const { PRIMARY_RATES, mergeRatesWithPrimary } = require('../shared/primary-rates');

// --- Firebase Admin Initialization ---
try {
    const serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin Initialized");
} catch (err) {
    console.warn("⚠️ Firebase Admin could not be initialized. Push notifications will be disabled. Ensure 'serviceAccountKey.json' exists in the backend folder.");
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT"]
    }
});

io.on('connection', (socket) => {
    console.log(`WebSocket user connected: ${socket.id}`);

    socket.on('join_room', (data) => {
        const { role, userId, storeId, riderId } = data || {};
        const id = userId || riderId;

        if (role === 'admin' || role === 'manager') {
            socket.join('dashboard_monitors');
            console.log(`Admin/Manager joined global dashboard room`);
        }
        if (role === 'rider' && id) {
            socket.join(`rider_${id}`);
            console.log(`Rider joined room rider_${id}`);
            if (storeId) {
                socket.join(`riders_store_${storeId}`);
                console.log(`Rider joined store room riders_store_${storeId}`);
            }
        }
        if (role === 'manager' && storeId) {
            socket.join(`store_${storeId}`);
            console.log(`Manager joined store room store_${storeId}`);
        }

        // Live Tracking: Join a specific order room to receive rider location
        if (data?.orderId) {
            socket.join(`tracking_${data.orderId}`);
            console.log(`User joined tracking room for order ${data.orderId}`);
            Order.findOne({ id: data.orderId }).then(order => {
                if (order) {
                    socket.emit('order_details', order);
                }
            }).catch(err => console.error("Error fetching order details for socket:", err));
        }
    });

    // Handle Rider Location Updates
    socket.on('update_location', async (data) => {
        const { riderId, lat, lng, orderId } = data;
        if (!riderId) return;

        console.log(`Rider ${riderId} updated location: ${lat}, ${lng}`);

        // Update in DB (optional, but good for last seen)
        try {
            await Rider.findOneAndUpdate(
                { id: riderId },
                { 
                    location: { 
                        lat, 
                        lng, 
                        lastUpdated: new Date().toISOString() 
                    } 
                }
            );

            // Broadcast to any active tracking rooms for this rider/order
            io.to('dashboard_monitors').emit('rider_moved', { riderId, lat, lng, orderId });
            if (orderId) {
                io.to(`tracking_${orderId}`).emit('rider_moved', { riderId, lat, lng });
            }
        } catch (err) {
            console.error("Location update error:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`WebSocket user disconnected: ${socket.id}`);
    });
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use(cors());
app.use(express.json());

// --- INTEGRATED WEB SERVING ---
// Serving your specific folder names from Hostinger
app.use('/admin', express.static(path.join(__dirname, 'admin-dashboard')));
app.use('/manager', express.static(path.join(__dirname, 'manager-panel')));
app.use(express.static(__dirname)); // Serves index.html, assets, and images from the root

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to Laundry Basket MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

mongoose.connection.once('open', () => {
    syncPrimaryRatesToCloud();
});

// --- Database Schemas ---

// --- Sequential ID Counter ---
const CounterSchema = new mongoose.Schema({
    id: { type: String, required: true },
    seq: { type: Number, default: 999 }
});
const Counter = mongoose.model('Counter', CounterSchema);

// 1. Order Schema
const OrderSchema = new mongoose.Schema({
    id: { type: String, unique: true }, 
    storeId: String,
    name: String,
    phone: String,
    address: String,
    services: [String],
    total: Number,
    commission: Number,
    netEarning: Number,
    status: { type: String, default: 'Pending' },
    paymentStatus: { type: String, default: 'Pending' }, // 'Pending' or 'Received'
    paymentMode: { type: String, default: null }, // 'Cash', 'Online QR', etc.
    source: { type: String, default: 'Web' }, 
    timestamp: { type: String, default: () => new Date().toLocaleString() },
    events: [{ status: String, time: { type: String, default: () => new Date().toLocaleTimeString() } }],
    assignedRiderId: { type: String, default: null },
    pickupCode: { type: String, default: null },
    deliveryCode: { type: String, default: null }
});
const Order = mongoose.model('Order', OrderSchema);

// 4. Store Schema
const StoreSchema = new mongoose.Schema({
    id: String,
    name: String,
    branchCode: { type: String, unique: true }, // e.g. IND, AN, BK
    manager: { type: String, unique: true }, // Username
    password: { type: String }, // Plain text or hash
    location: String,
    mapUrl: String,
    approved: { type: Boolean, default: true },
    status: { type: String, default: 'Active' },
    ordersCount: { type: Number, default: 0 }
});
const Store = mongoose.model('Store', StoreSchema);

// 5. Rider Schema
const RiderSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    storeId: String,
    name: String,
    username: { type: String, unique: true },
    password: { type: String },
    phone: String,
    status: { type: String, default: 'Active' },
    location: {
        lat: Number,
        lng: Number,
        lastUpdated: String
    },
    internalId: String,
    isVerified: { type: Boolean, default: false },
    profilePicture: { type: String, default: null }
});
const Rider = mongoose.model('Rider', RiderSchema);

// 5b. Customer Schema
const CustomerSchema = new mongoose.Schema({
    phone: { type: String, unique: true },
    name: String,
    accountType: { type: String, default: 'Residential' },
    profilePicture: { type: String, default: null },
    createdAt: { type: String, default: () => new Date().toLocaleString() }
});
const Customer = mongoose.model('Customer', CustomerSchema);

// 6. Ticket / Complaint Schema
const TicketSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    storeId: String,
    storeName: String,
    type: String, // Rider Related, Customer Complaint, etc.
    description: String,
    status: { type: String, default: 'Open' },
    raisedBy: String, // Manager Name
    timestamp: { type: String, default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
});
const Ticket = mongoose.model('Ticket', TicketSchema);

// 7. Inventory Schema
const InventorySchema = new mongoose.Schema({
    storeId: { type: String, default: 'GLOBAL' },
    item: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: 'kg' },
    lastUpdated: { type: String, default: () => new Date().toLocaleString() }
});
const Inventory = mongoose.model('Inventory', InventorySchema);

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
        // Global Admin Login
        if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
            const token = jwt.sign({ id: 'admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token, role: 'admin', name: 'Master Admin' });
        }

        // Store Manager Login
        const store = await Store.findOne({
            $or: [
                { manager: { $regex: new RegExp(`^${username.trim()}$`, 'i') } },
                { branchCode: { $regex: new RegExp(`^${username.trim()}$`, 'i') } },
                { id: { $regex: new RegExp(`^${username.trim()}$`, 'i') } }
            ]
        });
        if (!store) return res.status(401).json({ error: 'Store account not found' });

        // Compare plain text or hash
        let isMatch = (password.trim() === store.password);
        if (!isMatch && store.password) {
            try { isMatch = await bcrypt.compare(password.trim(), store.password); } catch (e) { isMatch = false; }
        }

        if (isMatch) {
            const token = jwt.sign({ id: store.id, role: 'manager' }, process.env.JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token, role: 'manager', id: store.id, name: store.name });
        } else {
            return res.status(401).json({ error: 'Invalid password' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// AUTH: Customer OTP Request (MSG91 Integration)
app.post('/api/otp/request', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    
    // Clean phone number (remove +91, spaces, etc.)
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    
    try {
        const response = await axios.get(
            `https://api.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=91${cleanPhone}&authkey=${process.env.MSG91_AUTH_KEY}`
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

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    try {
        const response = await axios.get(
            `https://api.msg91.com/api/v5/otp/verify?mobile=91${cleanPhone}&otp=${otp}&authkey=${process.env.MSG91_AUTH_KEY}`
        );

        if (response.data.type === 'success') {
            let customer = await Customer.findOne({ phone: cleanPhone });
            let isNewUser = false;
            if (!customer) {
                isNewUser = true;
                customer = new Customer({
                    phone: cleanPhone,
                    name: name || 'Laundry Basket User'
                });
                await customer.save();
            }
            const finalName = customer.name || name || 'Laundry Basket User';
            const token = jwt.sign({ id: cleanPhone, role: 'customer', name: finalName }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.json({
                token,
                name: finalName,
                phone: cleanPhone,
                profilePicture: customer.profilePicture || null,
                accountType: customer.accountType || 'Residential',
                isNewUser
            });
        } else {
            res.status(401).json({ error: 'Invalid OTP' });
        }
    } catch (err) {
        console.error("MSG91 Verify Error:", err.response?.data || err.message);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});

// GET: Customer Profile
app.get('/api/customer/profile', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Customer access required' });
    try {
        const customer = await Customer.findOne({ phone: req.user.id });
        if (!customer) {
            return res.json({ phone: req.user.id, name: req.user.name || 'Laundry Basket User', profilePicture: null, accountType: 'Residential' });
        }
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Update Customer Profile
app.post('/api/customer/profile', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Customer access required' });
    try {
        const { name, accountType, profilePicture } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (accountType !== undefined) updateData.accountType = accountType;
        if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

        const customer = await Customer.findOneAndUpdate(
            { phone: req.user.id },
            { $set: updateData },
            { new: true, upsert: true }
        );
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// GET: Customer's own orders (Customer only)
app.get('/api/orders/my-orders', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Customer access required' });
    try {
        const orders = await Order.find({ phone: req.user.id }).sort({ _id: -1 });
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

// GET: Single Order by ID
app.get('/api/orders/:id', verifyToken, async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        const cleanPhone1 = order.phone ? order.phone.replace(/\D/g, '').slice(-10) : '';
        const cleanPhone2 = req.user.id ? req.user.id.replace(/\D/g, '').slice(-10) : '';
        
        if (req.user.role !== 'admin' && 
            req.user.id !== order.storeId && 
            (req.user.role !== 'rider' || order.assignedRiderId !== req.user.id) && 
            (req.user.role !== 'customer' || cleanPhone1 !== cleanPhone2)) {
            return res.status(403).json({ error: 'Access denied to this order' });
        }
        
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Create New Order
app.post('/api/orders', async (req, res) => {
    console.log("Incoming Order Payload:", req.body);
    try {
        // AUTO-ROUTING: Ensure every order has a storeId so it shows for Managers
        const finalStoreId = req.body.storeId || 'LBBPL';
        // 1. Find the store to get its branchCode
        const store = await Store.findOne({ id: finalStoreId });
        const branchCode = store ? (store.branchCode || 'GEN') : 'GEN';        
        
        // Construction of Order ID: Use provided ID or generate BranchCode + (10000 + seq)
        let orderId = req.body.id;
        
        if (!orderId) {
            // Get sequence for this specific branch
            let counter = await Counter.findOneAndUpdate(
                { id: `order_id_${branchCode}` },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            orderId = `${branchCode}${counter.seq}`;
        }
        const generatedPickupCode = String(Math.floor(1000 + Math.random() * 9000));
        const generatedDeliveryCode = String(Math.floor(1000 + Math.random() * 9000));

        const orderData = {
            ...req.body,
            storeId: finalStoreId,
            id: orderId,
            status: req.body.status || 'Pending',
            pickupCode: req.body.pickupCode || generatedPickupCode,
            deliveryCode: req.body.deliveryCode || generatedDeliveryCode,
            timestamp: req.body.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            events: req.body.events || [{ status: 'Pending', time: new Date().toLocaleTimeString() }]
        };

        const newOrder = new Order(orderData);
        await newOrder.save();

        // Broadcast to Manager
        req.io.to(`store_${newOrder.storeId}`).emit('new_order_received', {
            message: `New order ${orderId} assigned to your store!`,
            order: newOrder
        });

        // Broadcast to Admin
        req.io.to('dashboard_monitors').emit('new_order_received', {
            message: `New order ${orderId} received!`,
            order: newOrder
        });

        res.status(201).json(newOrder);
    } catch (err) {
        console.error("Order Creation Error:", err.message);
        res.status(400).json({ error: err.message });
    }
});

// PUT: Update Order Status / Assign Rider (Authorized only)
app.put('/api/orders/:id', verifyToken, async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (req.user.role !== 'admin' && req.user.id !== order.storeId && (req.user.role !== 'rider' || order.assignedRiderId !== req.user.id)) {
            return res.status(403).json({ error: 'Not authorized to update this order' });
        }

        const updateData = { ...req.body };
        if (req.body.status) {
            updateData.$push = { events: { status: req.body.status } };
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { id: req.params.id },
            updateData,
            { new: true }
        );

        // Broadcast the update to monitors
        req.io.to('dashboard_monitors').emit('order_status_updated', {
            message: `Order ${updatedOrder.id} updated`,
            order: updatedOrder
        });

        // Notify Store
        if (updatedOrder.storeId) {
            req.io.to(`store_${updatedOrder.storeId}`).emit('order_status_updated', {
                message: `Order ${updatedOrder.id} updated`,
                order: updatedOrder
            });
        }

        // Notify Rider
        if (updatedOrder.assignedRiderId) {
            const riderPayload = {
                message: `New Task: Order ${updatedOrder.id}`,
                order: updatedOrder,
                sound: true
            };
            req.io.to(`rider_${updatedOrder.assignedRiderId}`).emit('new_task_assigned', riderPayload);
            req.io.to(`rider_${updatedOrder.assignedRiderId}`).emit('order_status_updated', riderPayload);
        }

        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET: Global Analytics (Admin only)
app.get('/api/analytics', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    try {
        const totalOrders = await Order.countDocuments();
        const activeOrders = await Order.countDocuments({ status: { $ne: 'Delivered' } });
        const totalStores = await Store.countDocuments();
        const orders = await Order.find();
        const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);

        // Simple growth mock for now
        res.json({
            totalRevenue,
            totalOrders,
            activeOrders,
            totalStores,
            revenueGrowth: "+12.5%",
            orderGrowth: "+8.2%"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pricing Matrix Logic
const RateSchema = new mongoose.Schema({
    item: String,
    category: String,
    serviceType: String, // e.g. "Dry Clean", "Shoe Cleaning", "Steam Iron"
    price: Number,
    displayPrice: String,
    source: String,
    locked: Boolean,
    updatedAt: String
});
const Rate = mongoose.model('Rate', RateSchema);

async function syncPrimaryRatesToCloud() {
    try {
        const syncedRates = [];
        for (const primaryRate of PRIMARY_RATES) {
            const existingRate = await Rate.findOne({
                item: primaryRate.item,
                category: primaryRate.category,
                serviceType: primaryRate.serviceType
            });
            if (existingRate && (existingRate.source === 'admin-rate-card' || existingRate.locked === false)) {
                syncedRates.push(existingRate);
                continue;
            }
            const syncedRate = await Rate.findOneAndUpdate(
                {
                    item: primaryRate.item,
                    category: primaryRate.category,
                    serviceType: primaryRate.serviceType
                },
                { $set: primaryRate },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            syncedRates.push(syncedRate);
        }
        console.log(`Synced ${syncedRates.length} approved rate-card prices to MongoDB.`);
        return syncedRates;
    } catch (err) {
        console.warn('Approved rate-card sync skipped:', err.message);
        return [];
    }
}

// Rider Login
app.post('/api/auth/rider-login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const rider = await Rider.findOne({ username: username.trim() });
        if (!rider) return res.status(401).json({ message: "Invalid Rider ID" });

        // Simple plain text for now as requested for 'admin assigned' simple creds
        if (rider.password !== password) return res.status(401).json({ message: "Invalid Password" });

        const token = jwt.sign({ id: rider.id, name: rider.name, role: 'rider' }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            rider: {
                id: rider.id,
                name: rider.name,
                username: rider.username,
                profilePicture: rider.profilePicture || null
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rider CRUD
app.get('/api/riders', verifyToken, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'manager') {
            filter.storeId = req.user.id;
        } else if (req.user.role === 'admin' && req.query.storeId) {
            filter.storeId = req.query.storeId;
        }
        const riders = await Rider.find(filter);
        res.json(riders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/riders', verifyToken, async (req, res) => {
    try {
        const riderData = { ...req.body };
        if (req.user.role === 'manager') {
            riderData.storeId = req.user.id;
        }
        const newRider = new Rider(riderData);
        await newRider.save();
        res.status(201).json(newRider);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/riders/:id', verifyToken, async (req, res) => {
    try {
        await Rider.deleteOne({ id: req.params.id });
        res.json({ message: "Rider deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT: Update Rider Profile Picture
app.put('/api/riders/:id/profile-picture', verifyToken, async (req, res) => {
    try {
        const { profilePicture } = req.body;
        const updatedRider = await Rider.findOneAndUpdate(
            { id: req.params.id },
            { profilePicture },
            { new: true }
        );
        if (!updatedRider) return res.status(404).json({ error: "Rider not found" });
        res.json(updatedRider);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT: Toggle Rider Status (Online/Offline)
app.put('/api/riders/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const updatedRider = await Rider.findOneAndUpdate(
            { id: req.params.id },
            { status },
            { new: true }
        );
        
        // Broadcast to all monitors
        req.io.emit('rider_status_updated', { riderId: req.params.id, status });
        
        res.json(updatedRider);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT: Verify Rider (Manager only)
app.put('/api/riders/:id/verify', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Manager access required' });
    }
    try {
        const { internalId } = req.body;
        const updatedRider = await Rider.findOneAndUpdate(
            { id: req.params.id },
            { 
                internalId: internalId,
                isVerified: true,
                status: 'Online'
            },
            { new: true }
        );
        
        if (!updatedRider) return res.status(404).json({ error: 'Rider not found' });
        
        req.io.emit('rider_verified', updatedRider);
        res.json({ message: "Rider verified successfully", rider: updatedRider });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/rates', async (req, res) => {
    try {
        const rates = await Rate.find().lean();
        res.json(mergeRatesWithPrimary(rates));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/rates', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        if (Array.isArray(req.body)) {
            const savedRates = [];
            for (const rate of req.body) {
                const rateData = {
                    ...rate,
                    displayPrice: rate.displayPrice || String(rate.price ?? ''),
                    source: 'admin-rate-card',
                    locked: false,
                    updatedAt: new Date().toISOString()
                };
                const savedRate = await Rate.findOneAndUpdate(
                    { item: rateData.item, category: rateData.category, serviceType: rateData.serviceType },
                    { $set: rateData },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                savedRates.push(savedRate);
            }
            return res.status(201).json(savedRates);
        }
        const newRate = new Rate({
            ...req.body,
            displayPrice: req.body.displayPrice || String(req.body.price ?? ''),
            source: 'admin-rate-card',
            locked: false,
            updatedAt: new Date().toISOString()
        });
        await newRate.save();
        res.status(201).json(newRate);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/rates/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const updateData = {
            ...req.body,
            displayPrice: req.body.displayPrice || String(req.body.price ?? ''),
            source: 'admin-rate-card',
            locked: false,
            updatedAt: new Date().toISOString()
        };
        const query = req.body.category && req.body.serviceType
            ? { item: req.params.id, category: req.body.category, serviceType: req.body.serviceType }
            : { item: req.params.id };
        const updatedRate = await Rate.findOneAndUpdate(query, { $set: updateData }, { new: true });
        res.json(updatedRate);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/rates/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        await Rate.deleteOne({ item: req.params.id });
        res.json({ message: "Service deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE: Order (Admin only)
app.delete('/api/orders/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    try {
        await Order.deleteOne({ id: req.params.id });
        res.json({ message: "Order deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Store (Admin only)
app.delete('/api/stores/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    try {
        await Store.deleteOne({ id: req.params.id });
        res.json({ message: "Store deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Purge System (Admin only)
app.post('/api/purge', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    try {
        await Order.deleteMany({});
        await Ticket.deleteMany({});
        await Counter.findOneAndUpdate({ id: 'orderId' }, { seq: 999 });
        req.io.emit('system_purged', { message: "System data cleared by Admin" });
        res.json({ message: "System purged successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Create Store (Admin)
app.post('/api/stores', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    try {
        const storeData = { ...req.body };
        if (storeData.address) storeData.location = storeData.address;
        if (storeData.user) storeData.manager = storeData.user;
        if (storeData.pass) storeData.password = storeData.pass;

        const newStore = new Store({ ...storeData, approved: true });
        await newStore.save();
        res.status(201).json(newStore);
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

// PUT: Update Store (Admin)
app.put('/api/stores/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    try {
        const updateData = { ...req.body };
        
        // Mapping frontend fields to backend schema
        if (updateData.address) updateData.location = updateData.address;
        if (updateData.user) updateData.manager = updateData.user;
        if (updateData.pass) updateData.password = updateData.pass;
        
        if (storeData.branchCode) updateData.branchCode = storeData.branchCode;
        
        const updatedStore = await Store.findOneAndUpdate(
            { id: req.params.id },
            updateData,
            { new: true }
        );
        
        // Broadcast store update
        req.io.to('dashboard_monitors').emit('store_updated', updatedStore);
        req.io.to(`store_${updatedStore.id}`).emit('store_updated', updatedStore);
        
        res.json(updatedStore);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// INVENTORY: Get All or Store Specific
app.get('/api/inventory', verifyToken, async (req, res) => {
    try {
        let filter = {};
        if (req.query.storeId) {
            filter.storeId = req.query.storeId;
        } else if (req.user.role === 'manager') {
            filter.storeId = req.user.id;
        }
        const items = await Inventory.find(filter);
        res.json(items);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// INVENTORY: Update/Add
app.post('/api/inventory', verifyToken, async (req, res) => {
    try {
        const { item, quantity, unit, storeId } = req.body;
        const finalStoreId = req.user.role === 'admin' ? (storeId || 'GLOBAL') : req.user.id;
        
        const updated = await Inventory.findOneAndUpdate(
            { item, storeId: finalStoreId },
            { 
                $set: { quantity: parseFloat(quantity) || 0, unit, lastUpdated: new Date().toLocaleString() } 
            },
            { upsert: true, new: true }
        );
        
        // Broadcast inventory update to relevant dashboards
        req.io.emit('inventory_updated', updated);
        
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUBLIC: Stats for Landing Page
app.get('/api/public/stats', async (req, res) => {
    try {
        const orderCount = await Order.countDocuments();
        const uniqueCustomers = await Order.distinct('phone');
        res.json({ 
            orderCount: 10000 + orderCount, 
            customerCount: 500 + uniqueCustomers.length 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUBLIC: Get All Active Stores
app.get('/api/public/stores', async (req, res) => {
    try {
        const stores = await Store.find({ 
            $or: [
                { approved: true },
                { approved: { $exists: false } }
            ]
        });
        
        // Map location to address for CX Website compatibility
        const publicStores = stores.map(s => {
            const storeObj = s.toObject();
            return {
                ...storeObj,
                address: storeObj.location || 'Opening Soon'
            };
        });
        
        res.json(publicStores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TICKETS: Raise Ticket (Manager)
app.post('/api/tickets', verifyToken, async (req, res) => {
    try {
        const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
        const newTicket = new Ticket({
            ...req.body,
            id: ticketId,
            storeId: req.user.id
        });
        await newTicket.save();
        
        // Notify Admin via Socket
        req.io.to('dashboard_monitors').emit('new_ticket_raised', {
            message: `New support ticket ${ticketId} from ${req.body.storeName}`,
            ticket: newTicket
        });
        
        res.status(201).json(newTicket);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// TICKETS: Get All Tickets (Admin)
app.get('/api/tickets', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const tickets = await Ticket.find().sort({ _id: -1 });
        res.json(tickets);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// TICKETS: Update Ticket Status (Admin)
app.put('/api/tickets/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const updatedTicket = await Ticket.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(updatedTicket);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUBLIC: Track Order
app.get('/api/public/track/:id', async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id.toUpperCase() });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`🚀 Unified Backend running on port ${PORT}`);
    
    // Auto-seed if empty
    try {
        const storeCount = await Store.countDocuments();
        if (storeCount === 0) {
            await new Store({
                id: 'LBBPL',
                name: 'Laundry Basket Branch',
                manager: 'LBBPLBK',
                password: 'pass123',
                approved: true,
                location: 'Bhopal'
            }).save();
            console.log("✅ Seeded default store LBBPLBK");
        }

        const rateCount = await Rate.countDocuments();
        if (rateCount === 0) {
            const defaultRates = [
                { item: 'Shirt', category: 'Men', serviceType: 'Dry Clean', price: 90 },
                { item: 'T-Shirt', category: 'Men', serviceType: 'Wash & Iron', price: 60 },
                { item: 'Saree', category: 'Women', serviceType: 'Dry Clean', price: 250 },
                { item: 'BedSheet', category: 'House Item', serviceType: 'Wash & Iron', price: 120 },
                { item: 'Sports Shoes', category: 'Shoes', serviceType: 'Shoe Cleaning', price: 299 }
            ];
            await Rate.insertMany(defaultRates);
            console.log("✅ Seeded default rates");
        }
    } catch (err) { console.error("Seeding error:", err); }
});
