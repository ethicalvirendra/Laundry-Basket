const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const admin = require('firebase-admin');

// --- Firebase Admin Initialization ---
let db = null;
try {
    const serviceAccount = require("./backend/serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log("✅ Firebase Admin + Firestore Initialized");
} catch (err) {
    console.warn("⚠️ Firebase Admin could not be initialized. Cloud sync will be disabled.");
}

// --- Firestore Cloud Sync Helper ---
// Mirrors MongoDB documents to Firestore for mobile app real-time subscriptions
const syncToFirestore = async (collection, id, data) => {
    if (!db) return;
    try {
        const cleanData = JSON.parse(JSON.stringify(data)); // strip Mongoose internals
        await db.collection(collection).doc(String(id)).set(cleanData, { merge: true });
    } catch (err) {
        console.warn(`Firestore sync failed [${collection}/${id}]:`, err.message);
    }
};

const deleteFromFirestore = async (collection, id) => {
    if (!db) return;
    try {
        await db.collection(collection).doc(String(id)).delete();
    } catch (err) {
        console.warn(`Firestore delete failed [${collection}/${id}]:`, err.message);
    }
};

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
        if (role === 'customer' && data?.phone) {
            const cleanPhone = data.phone.replace(/\D/g, '').slice(-10);
            socket.join(`customer_${cleanPhone}`);
            console.log(`Customer joined room customer_${cleanPhone}`);
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- INTEGRATED WEB SERVING ---
// Serving Next.js exported 'out' directories for dashboards
app.use('/admin', express.static(path.join(__dirname, 'admin-dashboard/out')));
app.get(/^\/manager\/manager\/(.*)/, (req, res) => {
    res.redirect(301, `/manager/${req.params[0]}`);
});
app.use('/manager', express.static(path.join(__dirname, 'manager-panel/out')));
app.use(express.static(__dirname)); // Serves index.html, assets, and images from the root

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to Laundry Basket MongoDB');
        
        // Dynamic Excel Order Importer Trigger Check
        const fs = require('fs');
        const triggerPath = path.join(__dirname, 'import_trigger.txt');
        if (fs.existsSync(triggerPath)) {
            console.log('🚀 Excel Import Trigger Found! Initiating cleanup and import...');
            try {
                // 1. Delete all existing orders from MongoDB
                console.log('🧹 Purging all existing order history from MongoDB...');
                const deleteResult = await Order.deleteMany({});
                console.log(`✅ Purged ${deleteResult.deletedCount} orders successfully.`);
                
                // 2. Load and parse the Excel file
                const xlsx = require('xlsx');
                const excelPath = "C:/Users/viren/Downloads/ORDER LIST.xlsx";
                console.log(`Loading Excel from: ${excelPath}`);
                
                if (fs.existsSync(excelPath)) {
                    const workbook = xlsx.readFile(excelPath);
                    const sheetName = workbook.SheetNames[0];
                    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
                    console.log(`📊 Found ${data.length} records in Excel sheet.`);
                    
                    // Fetch all stores to map branchCode dynamically
                    const stores = await Store.find({});
                    console.log(`Loaded ${stores.length} stores for dynamic mapping.`);
                    
                    let successCount = 0;
                    for (const row of data) {
                        const keys = Object.keys(row);
                        
                        // ID parsing
                        const idKey = keys.find(k => k.toLowerCase().includes('id'));
                        const id = idKey ? String(row[idKey]).trim() : `IMP_${Math.random().toString(36).substring(7).toUpperCase()}`;
                        
                        // Phone parsing
                        const phoneKey = keys.find(k => {
                            const lower = k.toLowerCase();
                            return lower.includes('phone') || lower.includes('mobile') || lower.includes('contact');
                        });
                        const phoneStr = phoneKey ? String(row[phoneKey]) : '';
                        const cleanPhone = phoneStr.replace(/\D/g, '').slice(-10) || '0000000000';
                        
                        // Name parsing
                        const nameKey = keys.find(k => {
                            const lower = k.toLowerCase();
                            return lower.includes('name') || lower.includes('customer');
                        });
                        const name = nameKey ? String(row[nameKey]).trim() : 'Customer';
                        
                        // Address parsing
                        const addrKey = keys.find(k => k.toLowerCase().includes('address') || k.toLowerCase().includes('location'));
                        const address = addrKey ? String(row[addrKey]).trim() : 'Self Pickup';
                        
                        // Services parsing
                        const serviceKey = keys.find(k => k.toLowerCase().includes('service'));
                        const servicesRaw = serviceKey ? row[serviceKey] : 'Wash & Iron';
                        const services = typeof servicesRaw === 'string' 
                            ? servicesRaw.split(',').map(s => s.trim()) 
                            : [String(servicesRaw).trim()];
                        
                        // Total parsing
                        const totalKey = keys.find(k => k.toLowerCase().includes('total') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('price') || k.toLowerCase().includes('net'));
                        const total = totalKey ? parseFloat(row[totalKey]) || 0 : 0;
                        
                        // Status parsing
                        const statusKey = keys.find(k => k.toLowerCase().includes('status'));
                        const status = statusKey ? String(row[statusKey]).trim() : 'Delivered to Cx';
                        
                        // Payment Status / Mode
                        const paymentStatusKey = keys.find(k => k.toLowerCase().includes('payment status') || k.toLowerCase().includes('pay status'));
                        const paymentStatus = paymentStatusKey ? String(row[paymentStatusKey]).trim() : 'Received';
                        
                        const paymentModeKey = keys.find(k => k.toLowerCase().includes('payment mode') || k.toLowerCase().includes('pay mode') || k.toLowerCase().includes('payment type'));
                        const paymentMode = paymentModeKey ? String(row[paymentModeKey]).trim() : 'Cash';
                        
                        // Date/Time parsing
                        const dateKey = keys.find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time') || k.toLowerCase().includes('timestamp'));
                        const timestamp = dateKey ? String(row[dateKey]).trim() : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                        
                        // Dynamic Store Assignment based on ID prefix
                        let storeId = 'LBBPL'; // Default store ID
                        for (const store of stores) {
                            if (store.branchCode && id.toUpperCase().startsWith(store.branchCode.toUpperCase())) {
                                storeId = store.id;
                                break;
                            }
                        }
                        
                        const commission = Math.round(total * 0.05); // 5% Commission
                        const netEarning = total - commission;
                        
                        const newOrder = new Order({
                            id,
                            storeId,
                            name,
                            phone: cleanPhone,
                            address,
                            services,
                            total,
                            commission,
                            netEarning,
                            status,
                            paymentStatus,
                            paymentMode,
                            source: 'Import',
                            timestamp,
                            events: [{ status, time: new Date().toLocaleTimeString() }]
                        });
                        
                        await newOrder.save();
                        successCount++;
                    }
                    console.log(`🎉 Successfully imported ${successCount} orders from ORDER LIST.xlsx.`);
                } else {
                    console.error(`❌ Excel file not found at path: ${excelPath}`);
                }
                
                // 3. Clean up the trigger file so it runs exactly once
                fs.unlinkSync(triggerPath);
                console.log('🗑️ import_trigger.txt removed to prevent loop on next reboot.');
            } catch (err) {
                console.error('❌ Error during Excel auto-import:', err);
            }
        }
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

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
    deliveryCode: { type: String, default: null },
    slot: { type: String, default: null },

    // Exact underscore-cased keys for Power BI / Excel dashboards
    customer_id: String,
    customer_name: String,
    mobile_number: String,
    order_date: String,
    items_ordered: String,
    quantity: Number,
    service_type: String,
    pickup_person: String,
    delivery_person: String,
    delivery_status: String,
    delivery_date: String,
    delivery_mode: String,
    payment_status: String,
    payment_mode: String,
    received_amount: Number,
    pending_amount: Number,
    received_date: String,
    received_month: String,
    total_days_aging: Number,
    pending_payment_days: Number,
    payment_risk: String,
    cx_type: String // Smart auto-categorized: Business / Regular / Premium / Walk-in / App
});
OrderSchema.index({ storeId: 1, _id: -1 });
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
    fcmToken: String, // For instant push notifications
    isOnline: { type: Boolean, default: false },
    profilePicture: { type: String, default: null }
});
const Rider = mongoose.model('Rider', RiderSchema);

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

// 7b. Stock Request Schema
const StockRequestSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    storeId: { type: String, required: true },
    storeName: { type: String, required: true },
    item: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'kg' },
    status: { type: String, default: 'Pending' }, // 'Pending', 'Approved', 'Rejected'
    notes: { type: String },
    timestamp: { type: String, default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
});
const StockRequest = mongoose.model('StockRequest', StockRequestSchema);

// 8. Review Schema
const ReviewSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    customerId: { type: String },
    storeId: { type: String },
    riderRating: { type: Number, required: true },
    serviceRating: { type: Number, required: true },
    feedback: { type: String },
    tipAmount: { type: Number, default: 0 },
    timestamp: { type: String, default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
});
const Review = mongoose.model('Review', ReviewSchema);

// 9. Customer Schema
const CustomerSchema = new mongoose.Schema({
    phone: { type: String, unique: true, required: true },
    name: { type: String },
    accountType: { type: String, default: 'Residential' },
    fcmToken: { type: String, default: null }, // For push notifications
    timestamp: { type: String, default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
    profilePicture: { type: String, default: null }
});
const Customer = mongoose.model('Customer', CustomerSchema);

// --- RIDER DETAILS POPULATION HELPERS ---
const populateRiderDetails = async (order) => {
    if (!order) return null;
    let orderObj = typeof order.toObject === 'function' ? order.toObject() : order;
    if (orderObj.assignedRiderId) {
        try {
            const rider = await Rider.findOne({ id: orderObj.assignedRiderId });
            if (rider) {
                orderObj.assignedRiderName = rider.name || 'Your Rider';
                orderObj.assignedRiderPhone = rider.phone || '';
            }
        } catch (e) {
            console.error("Error populating rider details:", e);
        }
    }
    return orderObj;
};

const populateRidersDetails = async (orders) => {
    if (!orders || !Array.isArray(orders)) return [];
    const orderObjects = orders.map(o => typeof o.toObject === 'function' ? o.toObject() : o);
    const riderIds = [...new Set(orderObjects.map(o => o.assignedRiderId).filter(Boolean))];
    if (riderIds.length === 0) return orderObjects;

    try {
        const riders = await Rider.find({ id: { $in: riderIds } }).select('id name phone').lean();
        const ridersById = new Map(riders.map(r => [r.id, r]));
        return orderObjects.map(order => {
            const rider = ridersById.get(order.assignedRiderId);
            if (rider) {
                order.assignedRiderName = rider.name || 'Your Rider';
                order.assignedRiderPhone = rider.phone || '';
            }
            return order;
        });
    } catch (e) {
        console.error("Error batch populating rider details:", e);
        return orderObjects;
    }
};

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

// --- AUTH HELPER ---
const handleLogin = async (req, res) => {
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
            return res.json({ token, role: 'manager', id: store.id, name: store.name, manager: store.manager });
        } else {
            return res.status(401).json({ error: 'Invalid password' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- API Routes ---

// REVIEWS
app.post('/api/reviews', async (req, res) => {
    try {
        const { orderId, customerId, storeId, riderRating, serviceRating, feedback } = req.body;
        const newReview = new Review({ orderId, customerId, storeId, riderRating, serviceRating, feedback });
        await newReview.save();
        res.status(201).json(newReview);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find({}).sort({ _id: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reviews/:storeId', async (req, res) => {
    try {
        const reviews = await Review.find({ storeId: req.params.storeId }).sort({ _id: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// AUTH: Login (Supporting both endpoints for frontend compatibility)
app.post('/api/login', handleLogin);
app.post('/api/auth/login', handleLogin);

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
    const { phone, otp, name, accountType } = req.body;

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    try {
        const response = await axios.get(
            `https://api.msg91.com/api/v5/otp/verify?mobile=91${cleanPhone}&otp=${otp}&authkey=${process.env.MSG91_AUTH_KEY}`
        );

        if (response.data.type === 'success') {
            // Save or update customer
            let customer = await Customer.findOne({ phone: cleanPhone });
            let isNewUser = false;
            
            if (!customer) {
                customer = new Customer({
                    phone: cleanPhone,
                    name: name || '',
                    accountType: accountType || 'Residential'
                });
                await customer.save();
                isNewUser = true;
            } else if (name || accountType) {
                if (name) customer.name = name;
                if (accountType) customer.accountType = accountType;
                await customer.save();
            }

            const token = jwt.sign({ id: phone, role: 'customer', name: customer.name, accountType: customer.accountType, profilePicture: customer.profilePicture }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, name: customer.name, phone: cleanPhone, accountType: customer.accountType, profilePicture: customer.profilePicture, isNewUser });
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
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Customer only' });
    try {
        const cleanPhone = req.user.id.replace(/\D/g, '').slice(-10);
        const customer = await Customer.findOne({ phone: cleanPhone });
        if (!customer) {
            return res.json({ phone: cleanPhone, name: req.user.name || 'Laundry Basket User', profilePicture: null, accountType: 'Residential' });
        }
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Update Customer Profile
app.post('/api/customer/profile', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Customer only' });
    const { name, accountType, profilePicture } = req.body;
    try {
        const customer = await Customer.findOne({ phone: req.user.id });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        
        if (name) customer.name = name;
        if (accountType) customer.accountType = accountType;
        if (profilePicture !== undefined) customer.profilePicture = profilePicture;
        await customer.save();
        
        res.json({ success: true, customer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: All Orders (Role-based access)
app.get('/api/orders', verifyToken, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'rider') filter.assignedRiderId = req.user.id;
        else if (req.user.role === 'manager') filter.storeId = req.user.id;
        else if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
        
        if (req.query.storeId && req.query.storeId !== 'all') {
            filter.storeId = req.query.storeId;
        }
        
        if (req.query.date) {
            const [year, month, day] = req.query.date.split('-');
            const formattedDateStr = `${day}/${month}/${year}`;
            filter.timestamp = { $regex: `^${formattedDateStr}` };
        }

        const orders = await Order.find(filter).sort({ _id: -1 }).select('-events -__v').lean();
        const populatedOrders = await populateRidersDetails(orders);
        return res.json(populatedOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Customer's own orders or Rider's assigned tasks
app.get('/api/orders/my-orders', verifyToken, async (req, res) => {
    try {
        if (req.user.role === 'customer') {
            const cleanPhone = req.user.id.replace(/\D/g, '').slice(-10);
            const orders = await Order.find({ 
                $or: [
                    { phone: cleanPhone },
                    { mobile_number: cleanPhone },
                    { phone: req.user.id },
                    { mobile_number: req.user.id }
                ]
            }).sort({ _id: -1 }).select('-events -__v').lean();
            const populatedOrders = await populateRidersDetails(orders);
            return res.json(populatedOrders);
        } else if (req.user.role === 'rider') {
            const orders = await Order.find({ assignedRiderId: req.user.id }).sort({ _id: -1 }).select('-events -__v').lean();
            const populatedOrders = await populateRidersDetails(orders);
            return res.json(populatedOrders);
        } else {
            return res.status(403).json({ error: 'Access denied' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Orders by Store (Manager, Admin, or Rider)
app.get('/api/orders/store/:storeId', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'rider' && req.user.id !== req.params.storeId) {
        return res.status(403).json({ error: 'Access denied to this store' });
    }
    try {
        const filter = { storeId: req.params.storeId };
        if (req.query.fast === '1') {
            const limit = Math.min(Number(req.query.limit) || 10000, 50000);
            const [orders, summary] = await Promise.all([
                Order.find(filter).sort({ _id: -1 }).limit(limit).select('-events -__v').lean(),
                Order.aggregate([
                    { $match: filter },
                    {
                        $group: {
                            _id: null,
                            totalOrders: { $sum: 1 },
                            pendingPayments: { $sum: { $ifNull: ['$pending_amount', 0] } },
                            receivedAmount: { $sum: { $ifNull: ['$received_amount', 0] } },
                            highRiskOrders: {
                                $sum: {
                                    $cond: [{ $eq: ['$payment_risk', 'HIGH RISK'] }, 1, 0]
                                }
                            }
                        }
                    }
                ])
            ]);
            const populatedOrders = await populateRidersDetails(orders);
            return res.json({
                orders: populatedOrders,
                summary: summary[0] || {
                    totalOrders: 0,
                    pendingPayments: 0,
                    receivedAmount: 0,
                    highRiskOrders: 0
                },
                limited: true,
                limit
            });
        }
        const orders = await Order.find(filter).sort({ _id: -1 }).select('-events -__v').lean();
        const populatedOrders = await populateRidersDetails(orders);
        res.json(populatedOrders);
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
        const cleanPhone3 = order.mobile_number ? String(order.mobile_number).replace(/\D/g, '').slice(-10) : '';
        
        if (req.user.role !== 'admin' && 
            req.user.id !== order.storeId && 
            req.user.role !== 'rider' && 
            (req.user.role !== 'customer' || (cleanPhone1 !== cleanPhone2 && cleanPhone3 !== cleanPhone2))) {
            return res.status(403).json({ error: 'Access denied to this order' });
        }
        
        const populatedOrder = await populateRiderDetails(order);
        res.json(populatedOrder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NOTIFICATION HELPER ---
const sendNotification = async ({ topic, token, title, body, data }) => {
    // 1. WebSocket (Instant)
    if (topic) {
        io.to(topic).emit('instant_alert', { title, body, data });
    } else if (token) {
        // Find socket by some map if needed, but usually we just use rooms
    }

    // 2. Firebase Push (Background)
    if (admin.apps.length > 0) {
        const message = {
            notification: { title, body },
            data: data ? Object.keys(data).reduce((acc, k) => { acc[k] = String(data[k]); return acc; }, {}) : {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'high_importance_channel',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                    visibility: 'public'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        contentAvailable: true
                    }
                }
            }
        };

        try {
            if (token) {
                await admin.messaging().send({ ...message, token });
            } else if (topic) {
                // Topic messaging for store-wide rider alerts
                await admin.messaging().send({ ...message, topic });
            }
        } catch (err) {
            console.warn("FCM Send Error:", err.message);
        }
    }
};

// --- API Routes ---

// Rider Token Registration
app.post('/api/riders/token', verifyToken, async (req, res) => {
    if (req.user.role !== 'rider') return res.status(403).json({ error: 'Rider only' });
    try {
        await Rider.findOneAndUpdate({ id: req.user.id }, { fcmToken: req.body.token });
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Customer Token Registration
app.post('/api/customers/token', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Customer only' });
    try {
        const cleanPhone = req.user.id.replace(/\D/g, '').slice(-10);
        await Customer.findOneAndUpdate({ phone: cleanPhone }, { fcmToken: req.body.token }, { upsert: true });
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST: Create New Order
app.post('/api/orders', async (req, res) => {
    try {
        const finalStoreId = req.body.storeId || 'LBBPL';
        const store = await Store.findOne({ id: finalStoreId });
        let branchCode = store ? (store.branchCode || 'GEN') : 'GEN';        
        
        // Fetch customer to check account type if not provided
        let isHotel = req.body.accountType === 'Hotel';
        if (!isHotel && req.body.phone) {
            const cleanPhone = req.body.phone.replace(/\D/g, '').slice(-10);
            const customer = await Customer.findOne({ phone: cleanPhone });
            if (customer && customer.accountType === 'Hotel') {
                isHotel = true;
            }
        }
        
        if (isHotel) {
            branchCode += 'H';
        }
        
        let cxType = req.body.cx_type || req.body.accountType;
        if (!cxType && req.body.phone) {
            const cleanPhone = req.body.phone.replace(/\D/g, '').slice(-10);
            const customer = await Customer.findOne({ phone: cleanPhone });
            if (customer) {
                cxType = customer.accountType;
            }
        }
        if (!cxType) {
            cxType = 'Residential';
        }

        const isBusiness = (cxType === 'Business');
        const storeName = branchCode.toUpperCase().startsWith('LBBPL') ? branchCode.substring(5) : branchCode;

        let orderId = req.body.id;
        if (!orderId) {
            const counterId = isBusiness ? `order_id_${branchCode}_bus` : `order_id_${branchCode}_res`;
            
            // Custom initial sequence logic: AN branch starts from existing counts
            const isAN = (branchCode.toUpperCase() === 'AN' || storeName.toUpperCase() === 'AN');
            let initialSeq = 1;
            if (isAN) {
                initialSeq = isBusiness ? 379 : 1135;
            }

            let counter = await Counter.findOne({ id: counterId });
            if (!counter) {
                counter = new Counter({ id: counterId, seq: initialSeq });
                await counter.save();
            } else {
                if (counter.seq < initialSeq) {
                    counter = await Counter.findOneAndUpdate(
                        { id: counterId },
                        { $set: { seq: initialSeq } },
                        { new: true }
                    );
                } else {
                    counter = await Counter.findOneAndUpdate(
                        { id: counterId },
                        { $inc: { seq: 1 } },
                        { new: true }
                    );
                }
            }

            if (isBusiness) {
                const seqPadded = String(counter.seq).padStart(6, '0');
                orderId = `LBBPLB${storeName}${seqPadded}`;
            } else {
                const seqPadded = String(counter.seq).padStart(7, '0');
                orderId = `LBBPL${storeName}${seqPadded}`;
            }
        }
        const generatedPickupCode = String(Math.floor(1000 + Math.random() * 9000));
        const generatedDeliveryCode = String(Math.floor(1000 + Math.random() * 9000));

        const orderData = {
            ...req.body,
            storeId: finalStoreId,
            id: orderId,
            cx_type: cxType,
            status: req.body.status || 'Pending',
            pickupCode: req.body.pickupCode || generatedPickupCode,
            deliveryCode: req.body.deliveryCode || generatedDeliveryCode,
            timestamp: req.body.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            events: req.body.events || [{ status: 'Pending', time: new Date().toLocaleTimeString() }]
        };

        const newOrder = new Order(orderData);
        await newOrder.save();
        req.io.emit("order_created", newOrder);
        // ☁️ Sync to Firestore (mobile app real-time)
        syncToFirestore('orders', newOrder.id, newOrder.toObject());

        // 🔔 NOTIFY MANAGER (Store Room)
        sendNotification({
            topic: `store_${finalStoreId}`,
            title: "🧺 New Order Received!",
            body: `Order ${orderId} has been placed at your branch.`,
            data: { orderId, type: 'new_order', total: String(newOrder.total) }
        });

        // 🔔 NOTIFY RIDERS (Store Riders Room)
        sendNotification({
            topic: `riders_store_${finalStoreId}`,
            title: "🛵 New Pickup Available!",
            body: `Order ${orderId} | ${newOrder.name} | Loc: ${newOrder.address}`,
            data: { 
                orderId, 
                type: 'new_pickup_available',
                name: String(newOrder.name),
                phone: String(newOrder.phone),
                address: String(newOrder.address),
                info: String(Array.isArray(newOrder.services) ? newOrder.services.join(', ') : newOrder.services || '')
            }
        });
        
        req.io.to(`riders_store_${finalStoreId}`).emit('new_task_assigned', {
            message: `New pickup available for ${newOrder.name}`,
            order: newOrder
        });

        // Broadcast to admin dashboard
        req.io.to('dashboard_monitors').emit('new_order_received', {
            message: `New order ${orderId} received!`,
            order: newOrder
        });

        // Broadcast to customer room
        if (newOrder.phone) {
            const cleanPhone = newOrder.phone.replace(/\D/g, '').slice(-10);
            req.io.to(`customer_${cleanPhone}`).emit('order_created', {
                message: `Your order ${orderId} has been placed!`,
                order: newOrder
            });
        }

        res.status(201).json(newOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT: Update Order Status / Assign Rider (Authorized only)
app.put('/api/orders/:id', verifyToken, async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (req.user.role !== 'admin' && req.user.id !== order.storeId && req.user.role !== 'rider') {
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
        req.io.emit("order_updated", updatedOrder);
        // ☁️ Sync to Firestore (mobile app real-time)
        syncToFirestore('orders', updatedOrder.id, updatedOrder.toObject());

        req.io.to('dashboard_monitors').emit('order_status_updated', {
            message: `Order ${updatedOrder.id} updated`,
            order: updatedOrder
        });

        if (updatedOrder.storeId) {
            req.io.to(`store_${updatedOrder.storeId}`).emit('order_status_updated', {
                message: `Order ${updatedOrder.id} updated`,
                order: updatedOrder
            });
        }

        // Broadcast to customer room
        if (updatedOrder.phone) {
            const cleanPhone = updatedOrder.phone.replace(/\D/g, '').slice(-10);
            req.io.to(`customer_${cleanPhone}`).emit('order_updated', {
                message: `Your order ${updatedOrder.id} status is now: ${updatedOrder.status}`,
                order: updatedOrder
            });

            // Trigger FCM Background Push Notification to Customer
            if (req.body.status) {
                Customer.findOne({ phone: cleanPhone }).then(cust => {
                    if (cust && cust.fcmToken) {
                        sendNotification({
                            token: cust.fcmToken,
                            title: `🧺 Order Update: ${updatedOrder.id}`,
                            body: `Your order status has been updated to: ${updatedOrder.status}`,
                            data: { orderId: updatedOrder.id, type: 'order_status_update', status: updatedOrder.status }
                        });
                    }
                }).catch(e => console.error("Error sending push to customer:", e));
            }
        }

        // Fetch rider if assigned to include name
        let riderName = "Your Rider";
        let rider = null;
        if (updatedOrder.assignedRiderId) {
            rider = await Rider.findOne({ id: updatedOrder.assignedRiderId });
            if (rider) riderName = rider.name || riderName;
        }

        // Broadcast to tracking room
        req.io.to(`tracking_${updatedOrder.id}`).emit('order_status_updated', {
            status: updatedOrder.status,
            order: updatedOrder,
            riderName: riderName
        });

        if (rider) {
            if (req.body.assignedRiderId) {
                sendNotification({
                    topic: `rider_${updatedOrder.assignedRiderId}`,
                    token: rider.fcmToken,
                    title: "📦 Task Assigned!",
                    body: `Order ${updatedOrder.id} for ${updatedOrder.name} | Call: ${updatedOrder.phone} | Loc: ${updatedOrder.address}`,
                    data: { 
                        orderId: updatedOrder.id, 
                        type: 'task_assigned',
                        name: String(updatedOrder.name),
                        phone: String(updatedOrder.phone),
                        address: String(updatedOrder.address),
                        info: String(Array.isArray(updatedOrder.services) ? updatedOrder.services.join(', ') : updatedOrder.services || '')
                    }
                });
                
                // Push via Socket for instant app UI update
                req.io.to(`rider_${updatedOrder.assignedRiderId}`).emit('new_task_assigned', {
                    message: `Order ${updatedOrder.id} has been assigned to you.`,
                    order: updatedOrder
                });
            }

            req.io.to(`rider_${updatedOrder.assignedRiderId}`).emit('order_status_updated', {
                status: updatedOrder.status,
                order: updatedOrder
            });
        }

        const populatedOrder = await populateRiderDetails(updatedOrder);
        res.json(populatedOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE: Order (Admin only)
app.delete('/api/orders/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete orders' });
        }
        const order = await Order.findOneAndDelete({ id: req.params.id });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        req.io.emit("order_deleted", { id: req.params.id });
        res.json({ message: "Order deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET: Global Analytics (Admin only)
app.get('/api/analytics', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    try {
        let filter = {};
        if (req.query.storeId && req.query.storeId !== 'all') filter.storeId = req.query.storeId;
        
        if (req.query.date) {
            const [year, month, day] = req.query.date.split('-');
            const formattedDateStr = `${day}/${month}/${year}`;
            filter.timestamp = { $regex: `^${formattedDateStr}` };
        }

        const totalOrders = await Order.countDocuments(filter);
        const activeOrders = await Order.countDocuments({ ...filter, status: { $ne: 'Delivered' } });
        const totalStores = await Store.countDocuments();
        const orders = await Order.find(filter);
        const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);

        res.json({
            totalRevenue,
            totalOrders,
            activeOrders,
            totalStores,
            revenueGrowth: "+0%", // Static for now, can be computed based on date
            orderGrowth: "+0%"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pricing Matrix Schema
const RateSchema = new mongoose.Schema({
    item: String,
    category: String,
    serviceType: String,
    price: Number
});
const Rate = mongoose.model('Rate', RateSchema);

// Rider Auth & CRUD
app.post('/api/auth/rider-login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const rider = await Rider.findOne({ username: username.trim() });
        if (!rider) return res.status(401).json({ message: "Invalid Rider ID" });
        if (rider.password !== password) return res.status(401).json({ message: "Invalid Password" });

        const token = jwt.sign({ id: rider.id, name: rider.name, role: 'rider' }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, rider: { id: rider.id, name: rider.name, username: rider.username, profilePicture: rider.profilePicture, storeId: rider.storeId } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/riders/:id/profile-picture', verifyToken, async (req, res) => {
    try {
        const { profilePicture } = req.body;
        const updated = await Rider.findOneAndUpdate(
            { id: req.params.id },
            { profilePicture },
            { new: true }
        );
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/riders', verifyToken, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'manager') filter.storeId = req.user.id;
        else if (req.user.role === 'admin' && req.query.storeId) filter.storeId = req.query.storeId;
        const riders = await Rider.find(filter);
        res.json(riders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/riders', verifyToken, async (req, res) => {
    try {
        const riderData = { ...req.body };
        if (req.user.role === 'manager') riderData.storeId = req.user.id;
        
        // Auto-generate Rider ID (LBBPL + BranchCode + R1/R2...)
        if (!riderData.username || riderData.username.trim() === '') {
            const store = await Store.findOne({ id: riderData.storeId });
            const branchCode = store ? (store.branchCode || 'GEN') : 'GEN';
            const cleanBranchCode = branchCode.replace(/^LBBPL/i, '');
            const count = await Rider.countDocuments({ storeId: riderData.storeId });
            riderData.username = `LBBPL${cleanBranchCode}R${count + 1}`;
            riderData.id = riderData.username;
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

app.put('/api/riders/:id/status', verifyToken, async (req, res) => {
    try {
        const updatedRider = await Rider.findOneAndUpdate({ id: req.params.id }, { status: req.body.status }, { new: true });
        req.io.emit('rider_status_updated', { riderId: req.params.id, status: req.body.status });
        res.json(updatedRider);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/riders/:id/online', verifyToken, async (req, res) => {
    try {
        const { isOnline } = req.body;
        const updatedRider = await Rider.findOneAndUpdate({ id: req.params.id }, { isOnline }, { new: true });
        req.io.emit('rider_status_updated', { riderId: req.params.id, isOnline });
        res.json(updatedRider);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/riders/:id/profile-picture', verifyToken, async (req, res) => {
    try {
        const { profilePicture } = req.body;
        const updatedRider = await Rider.findOneAndUpdate({ id: req.params.id }, { profilePicture }, { new: true });
        res.json(updatedRider);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/riders/metrics', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'rider') return res.status(403).json({ error: 'Rider only' });
        
        // Fetch all orders ever assigned to this rider to calculate comprehensive metrics
        const allRiderOrders = await Order.find({ assignedRiderId: req.user.id });
        
        let tasksCompleted = 0;
        let incentiveEarned = 0;
        
        allRiderOrders.forEach(o => {
            if (['Delivered to Cx', 'Completed'].includes(o.status)) {
                tasksCompleted++;
                incentiveEarned += 8; // Picked up (4) + Delivered (4)
            } else if (!['Pending', 'Out for Pickup', 'Cancelled', 'Customer Unreachable'].includes(o.status)) {
                tasksCompleted++;
                incentiveEarned += 4; // Picked up only
            }
        });
        
        const tasksAssigned = allRiderOrders.length;
        
        // Fetch reviews for these orders
        const orderIds = allRiderOrders.map(o => o.id);
        const reviews = await Review.find({ orderId: { $in: orderIds } }).sort({ _id: -1 });
        const totalTips = reviews.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
        
        let averageRating = 0.0;
        if (reviews.length > 0) {
            const sumRating = reviews.reduce((sum, r) => sum + (r.riderRating || 0), 0);
            averageRating = parseFloat((sumRating / reviews.length).toFixed(1));
        }
        
        // Calculate dynamic On-Time Rate: e.g., 98% if they have completed orders, else 0% (as requested by user to zero everything)
        const onTimeRate = tasksCompleted > 0 ? 98 : 0;
        
        // Map recent reviews
        const recentReviews = reviews.map(r => {
            const ord = allRiderOrders.find(o => o.id === r.orderId);
            return {
                comment: r.feedback || "Good service!",
                author: ord ? ord.name : "Customer",
                rating: String(r.riderRating || 5.0),
                date: r.timestamp ? r.timestamp.split(',')[0] : "Recent"
            };
        });
        
        res.json({
            tasksAssigned,
            tasksCompleted,
            incentiveEarned,
            totalTips,
            averageRating,
            onTimeRate,
            recentReviews
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/riders/:id/verify', verifyToken, async (req, res) => {
    try {
        const updatedRider = await Rider.findOneAndUpdate(
            { id: req.params.id },
            { internalId: req.body.internalId, isVerified: true, status: 'Online' },
            { new: true }
        );
        req.io.emit('rider_verified', updatedRider);
        res.json(updatedRider);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/riders/:id/metrics', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ error: 'Not authorized' });
        
        const riderId = req.params.id;
        
        const rider = await Rider.findOne({ id: riderId });
        const orders = await Order.find({ assignedRiderId: riderId });
        
        const activeOrders = orders.filter(o => !['Completed', 'Delivered to Cx', 'Cancelled', 'Customer Unreachable'].includes(o.status));
        
        let incentive = 0;
        let tasksCompleted = 0;
        orders.forEach(o => {
            if (['Delivered to Cx', 'Completed'].includes(o.status)) {
                tasksCompleted++;
                incentive += 8; // Picked up (4) + Delivered (4)
            } else if (!['Pending', 'Out for Pickup', 'Cancelled', 'Customer Unreachable'].includes(o.status)) {
                tasksCompleted++;
                incentive += 4; // Picked up only
            }
        });
        
        res.json({
            tasksAssigned: orders.length,
            tasksCompleted: tasksCompleted,
            activeTasks: activeOrders.length,
            totalIncentives: incentive,
            currentStatus: activeOrders.length > 0 ? 'On Duty' : 'Standby',
            location: rider?.location || null
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// Rates CRUD
app.get('/api/rates', async (req, res) => {
    try { res.json(await Rate.find()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/rates', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const newRate = new Rate(req.body);
        await newRate.save();
        req.io.emit("rates_updated", newRate);
        syncToFirestore('rates', newRate._id, newRate.toObject());
        res.status(201).json(newRate);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/rates/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const updatedRate = await Rate.findOneAndUpdate({ item: req.params.id }, req.body, { new: true });
        req.io.emit("rates_updated", updatedRate);
        if (updatedRate) syncToFirestore('rates', updatedRate._id, updatedRate.toObject());
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

// Admin System Controls
app.post('/api/purge', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        await Order.deleteMany({});
        await Ticket.deleteMany({});
        await Counter.findOneAndUpdate({ id: 'orderId' }, { seq: 999 });
        req.io.emit('system_purged', { message: "System data cleared" });
        res.json({ message: "Purged" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// HTTP On-Demand Excel Importer
app.get('/api/admin/import-excel', async (req, res) => {
    const fs = require('fs');
    const xlsx = require('xlsx');
    const excelPath = "C:/Users/viren/Downloads/ORDER LIST.xlsx";
    
    console.log('⚡ On-Demand Excel Import triggered via HTTP GET...');
    try {
        if (!fs.existsSync(excelPath)) {
            return res.status(404).json({ error: `Excel file not found at path: ${excelPath}` });
        }

        // 1. Delete all existing orders from MongoDB
        console.log('🧹 Purging all existing order history from MongoDB...');
        const deleteResult = await Order.deleteMany({});
        
        // 2. Load and parse the Excel file
        const workbook = xlsx.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        // Fetch all stores to map branchCode dynamically
        const stores = await Store.find({});
        
        let successCount = 0;
        for (const row of data) {
            const keys = Object.keys(row);
            
            // ID parsing
            const idKey = keys.find(k => k.toLowerCase().includes('id'));
            const id = idKey ? String(row[idKey]).trim() : `IMP_${Math.random().toString(36).substring(7).toUpperCase()}`;
            
            // Phone parsing
            const phoneKey = keys.find(k => {
                const lower = k.toLowerCase();
                return lower.includes('phone') || lower.includes('mobile') || lower.includes('contact');
            });
            const phoneStr = phoneKey ? String(row[phoneKey]) : '';
            const cleanPhone = phoneStr.replace(/\D/g, '').slice(-10) || '0000000000';
            
            // Name parsing
            const nameKey = keys.find(k => {
                const lower = k.toLowerCase();
                return lower.includes('name') || lower.includes('customer');
            });
            const name = nameKey ? String(row[nameKey]).trim() : 'Customer';
            
            // Address parsing
            const addrKey = keys.find(k => k.toLowerCase().includes('address') || k.toLowerCase().includes('location'));
            const address = addrKey ? String(row[addrKey]).trim() : 'Self Pickup';
            
            // Services parsing
            const serviceKey = keys.find(k => k.toLowerCase().includes('service'));
            const servicesRaw = serviceKey ? row[serviceKey] : 'Wash & Iron';
            const services = typeof servicesRaw === 'string' 
                ? servicesRaw.split(',').map(s => s.trim()) 
                : [String(servicesRaw).trim()];
            
            // Total parsing
            const totalKey = keys.find(k => k.toLowerCase().includes('total') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('price') || k.toLowerCase().includes('net'));
            const total = totalKey ? parseFloat(row[totalKey]) || 0 : 0;
            
            // Status parsing
            const statusKey = keys.find(k => k.toLowerCase().includes('status'));
            const status = statusKey ? String(row[statusKey]).trim() : 'Delivered to Cx';
            
            // Payment Status / Mode
            const paymentStatusKey = keys.find(k => k.toLowerCase().includes('payment status') || k.toLowerCase().includes('pay status'));
            const paymentStatus = paymentStatusKey ? String(row[paymentStatusKey]).trim() : 'Received';
            
            const paymentModeKey = keys.find(k => k.toLowerCase().includes('payment mode') || k.toLowerCase().includes('pay mode') || k.toLowerCase().includes('payment type'));
            const paymentMode = paymentModeKey ? String(row[paymentModeKey]).trim() : 'Cash';
            
            // Date/Time parsing
            const dateKey = keys.find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time') || k.toLowerCase().includes('timestamp'));
            const timestamp = dateKey ? String(row[dateKey]).trim() : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            
            // Dynamic Store Assignment based on ID prefix
            let storeId = 'LBBPL'; // Default store ID
            for (const store of stores) {
                if (store.branchCode && id.toUpperCase().startsWith(store.branchCode.toUpperCase())) {
                    storeId = store.id;
                    break;
                }
            }
            
            const commission = Math.round(total * 0.05); // 5% Commission
            const netEarning = total - commission;
            
            const newOrder = new Order({
                id,
                storeId,
                name,
                phone: cleanPhone,
                address,
                services,
                total,
                commission,
                netEarning,
                status,
                paymentStatus,
                paymentMode,
                source: 'Import',
                timestamp,
                events: [{ status, time: new Date().toLocaleTimeString() }]
            });
            
            await newOrder.save();
            successCount++;
        }
        
        req.io.emit('system_purged', { message: "Excel import complete" });
        res.json({ 
            success: true, 
            message: `Successfully purged old history and imported ${successCount} orders from ORDER LIST.xlsx.`,
            purgedCount: deleteResult.deletedCount,
            importedCount: successCount
        });
    } catch (err) {
        console.error('❌ Error during on-demand Excel import:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stores', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try { res.json(await Store.find()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/stores', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const storeData = { ...req.body, approved: true };
        if (storeData.address) storeData.location = storeData.address;
        if (storeData.user) storeData.manager = storeData.user;
        if (storeData.pass) storeData.password = storeData.pass;
        const newStore = new Store(storeData);
        await newStore.save();
        req.io.emit('stores_updated', newStore);
        syncToFirestore('stores', newStore.id, newStore.toObject());
        res.status(201).json(newStore);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/stores/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const updateData = { ...req.body };
        if (updateData.address) updateData.location = updateData.address;
        if (updateData.user) updateData.manager = updateData.user;
        if (updateData.pass) updateData.password = updateData.pass;
        const updated = await Store.findOneAndUpdate({ id: req.params.id }, updateData, { new: true });
        req.io.emit('stores_updated', updated);
        if (updated) syncToFirestore('stores', updated.id, updated.toObject());
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/stores/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        await Store.deleteOne({ id: req.params.id });
        res.json({ message: "Store deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Inventory Routes
app.get('/api/inventory', verifyToken, async (req, res) => {
    try {
        let filter = {};
        if (req.query.storeId) filter.storeId = req.query.storeId;
        else if (req.user.role === 'manager') filter.storeId = req.user.id;
        res.json(await Inventory.find(filter));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory', verifyToken, async (req, res) => {
    try {
        const { item, quantity, unit, storeId } = req.body;
        const finalStoreId = req.user.role === 'admin' ? (storeId || 'GLOBAL') : req.user.id;
        const updated = await Inventory.findOneAndUpdate(
            { item, storeId: finalStoreId },
            { $set: { quantity: parseFloat(quantity) || 0, unit, lastUpdated: new Date().toLocaleString() } },
            { upsert: true, new: true }
        );
        req.io.emit('inventory_updated', updated);
        syncToFirestore('inventory', `${finalStoreId}_${item}`, updated.toObject());
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stock Request Routes
app.post('/api/stock-requests', verifyToken, async (req, res) => {
    try {
        const { item, quantity, unit, notes, storeName } = req.body;
        const requestId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
        const finalStoreId = req.user.role === 'admin' ? (req.body.storeId || 'GLOBAL') : req.user.id;
        const finalStoreName = req.user.role === 'admin' ? (storeName || 'Admin') : (storeName || 'Branch');
        const newRequest = new StockRequest({
            id: requestId,
            storeId: finalStoreId,
            storeName: finalStoreName,
            item,
            quantity: parseFloat(quantity) || 0,
            unit: unit || 'kg',
            notes: notes || '',
            status: 'Pending'
        });
        await newRequest.save();
        req.io.emit("stock_requests_updated", newRequest);
        req.io.to('dashboard_monitors').emit('new_stock_request', { message: `New stock request ${requestId} from ${finalStoreName}`, request: newRequest });
        syncToFirestore('stock_requests', requestId, newRequest.toObject());
        res.status(201).json(newRequest);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stock-requests', verifyToken, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'manager') filter.storeId = req.user.id;
        else if (req.user.role === 'admin' && req.query.storeId) filter.storeId = req.query.storeId;
        const requests = await StockRequest.find(filter).sort({ _id: -1 });
        res.json(requests);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/stock-requests/:id', verifyToken, async (req, res) => {
    try {
        const { status, notes } = req.body;
        const request = await StockRequest.findOne({ id: req.params.id });
        if (!request) return res.status(404).json({ error: 'Request not found' });

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update request status' });
        }

        // If approved and not previously approved, increment branch inventory automatically!
        if (status === 'Approved' && request.status !== 'Approved') {
            const updatedInventory = await Inventory.findOneAndUpdate(
                { item: request.item, storeId: request.storeId },
                { 
                    $inc: { quantity: request.quantity }, 
                    $set: { lastUpdated: new Date().toLocaleString() } 
                },
                { upsert: true, new: true }
            );
            req.io.emit('inventory_updated', updatedInventory);
            syncToFirestore('inventory', `${request.storeId}_${request.item}`, updatedInventory.toObject());
        }

        request.status = status;
        if (notes !== undefined) request.notes = notes;
        await request.save();

        req.io.emit("stock_requests_updated", request);
        syncToFirestore('stock_requests', request.id, request.toObject());
        res.json(request);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// Support Ticket Routes
app.post('/api/tickets', verifyToken, async (req, res) => {
    try {
        const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
        const newTicket = new Ticket({ ...req.body, id: ticketId, storeId: req.user.id });
        await newTicket.save();
        req.io.emit("tickets_updated", newTicket);
        req.io.to('dashboard_monitors').emit('new_ticket_raised', { message: `New ticket ${ticketId}`, ticket: newTicket });
        syncToFirestore('tickets', ticketId, newTicket.toObject());
        res.status(201).json(newTicket);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tickets', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try { res.json(await Ticket.find().sort({ _id: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tickets/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const updated = await Ticket.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUBLIC ENDPOINTS
app.get('/api/public/stats', async (req, res) => {
    try {
        const orderCount = await Order.countDocuments();
        const customerCount = await Order.distinct('phone');
        res.json({ orderCount: 10000 + orderCount, customerCount: 500 + customerCount.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/public/stores', async (req, res) => {
    try {
        const stores = await Store.find({ approved: true });
        res.json(stores.map(s => ({ ...s.toObject(), address: s.location || 'Opening Soon' })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/public/track/:id', async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id.toUpperCase() });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// EXPORT & LOGS
const xlsx = require('xlsx');

app.get('/api/export/excel', verifyToken, async (req, res) => {
    try {
        const orders = await Order.find().sort({ timestamp: -1 }).lean();
        
        const data = orders.map(order => ({
            'Order ID': order.id,
            'Date': order.timestamp,
            'Customer Name': order.name,
            'Phone': order.phone,
            'Address': order.address || 'Walk-in',
            'Source': order.source || 'Walk-in',
            'Services': Array.isArray(order.services) ? order.services.join(', ') : order.services,
            'Status': order.status,
            'Total (₹)': order.total,
            'Discount (%)': order.discount || 0
        }));

        const worksheet = xlsx.utils.json_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Orders');
        
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename="Global_Orders_Report.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate Excel file' });
    }
});

app.post('/api/logs', async (req, res) => {
    console.log("📝 Log Received:", req.body);
    res.json({ status: "logged" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Unified Production Server running on port ${PORT}`);
});
