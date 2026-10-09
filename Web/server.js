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

// --- Nodemailer SMTP Initialization ---
const nodemailer = require('nodemailer');
let mailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    console.log("✉️ Nodemailer SMTP Transporter configured");
} else {
    console.warn("⚠️ SMTP credentials not found in env. Welcome email functionality will be disabled.");
}

const sendWelcomeEmail = async (toEmail) => {
    if (!mailTransporter) {
        console.warn("⚠️ Cannot send welcome email: Transporter not configured.");
        return;
    }
    const fromAddress = process.env.SMTP_FROM || `"Laundry Basket" <${process.env.SMTP_USER}>`;
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Laundry Basket!</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8fafc;
                margin: 0;
                padding: 0;
                color: #334155;
            }
            .email-container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }
            .header {
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                color: #ffffff;
                text-align: center;
                padding: 35px 20px;
            }
            .header h1 {
                margin: 0;
                font-size: 26px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }
            .content {
                padding: 35px 25px;
                line-height: 1.6;
            }
            .welcome-text {
                font-size: 18px;
                font-weight: 600;
                color: #1e293b;
                margin-top: 0;
            }
            .coupon-box {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border: 2px dashed #22c55e;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 25px 0;
            }
            .coupon-title {
                font-size: 14px;
                color: #166534;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                font-weight: 700;
                margin: 0 0 5px 0;
            }
            .coupon-code {
                font-size: 32px;
                color: #15803d;
                font-weight: 800;
                letter-spacing: 2px;
                margin: 5px 0;
            }
            .coupon-subtitle {
                font-size: 13px;
                color: #166534;
                margin: 5px 0 0 0;
                opacity: 0.8;
            }
            .btn {
                display: inline-block;
                background-color: #2563eb;
                color: #ffffff !important;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 6px;
                font-weight: 600;
                font-size: 15px;
                margin: 15px 0;
                text-align: center;
                box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
            }
            .btn:hover {
                background-color: #1d4ed8;
            }
            .footer {
                background-color: #f1f5f9;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #64748b;
                border-top: 1px solid #e2e8f0;
            }
            .footer p {
                margin: 5px 0;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>Welcome to Laundry Basket!</h1>
            </div>
            <div class="content">
                <p class="welcome-text">Hi there,</p>
                <p>Thank you for subscribing to our newsletter! We are thrilled to have you join our community of Bhopal residents who enjoy clean clothes and hassle-free laundry service.</p>
                <p>As a warm welcome, here is your exclusive first-time subscriber discount coupon:</p>
                
                <div class="coupon-box">
                    <p class="coupon-title">Your 20% Off Coupon</p>
                    <div class="coupon-code">WELCOME20</div>
                    <p class="coupon-subtitle">Valid on any Wash & Iron, Dry Cleaning, or Steam Iron order.</p>
                </div>
                
                <p>To redeem this, simply enter the coupon code in the notes/instructions when booking your pickup online, or mention it to our representative at the time of pickup.</p>
                
                <div style="text-align: center;">
                    <a href="https://laundrybasket.in" class="btn">Book a Pickup Now</a>
                </div>
                
                <p style="margin-top: 25px;">If you have any questions or need support, feel free to reach out to us on WhatsApp or reply directly to this email.</p>
                <p>Best regards,<br><strong>The Laundry Basket Team</strong></p>
            </div>
            <div class="footer">
                <p><strong>Laundry Basket Bhopal</strong></p>
                <p>Bawadiya Kalan, Bhopal, Madhya Pradesh</p>
                <p>&copy; ${new Date().getFullYear()} Laundry Basket. All rights reserved.</p>
                <p style="font-size: 10px; margin-top: 10px; opacity: 0.7;">You received this email because you subscribed on our website. You can unsubscribe at any time.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    try {
        const info = await mailTransporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: '🎉 Welcome to Laundry Basket! Get 20% Off Your First Order',
            html: htmlContent
        });
        console.log(`✉️ Welcome email successfully sent to ${toEmail}. Message ID: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error('❌ Failed to send welcome email:', err.message);
        throw err;
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

// Android App Links & iOS Universal Links verification (.well-known)
app.get('/.well-known/assetlinks.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, '.well-known', 'assetlinks.json'));
});
app.get('/.well-known/apple-app-site-association', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, '.well-known', 'apple-app-site-association'));
});

app.use(express.static(__dirname, { dotfiles: 'allow' })); // Serves index.html, assets, and images from the root

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to Laundry Basket MongoDB');
        
        // Ensure single main store (Ayodhya Nagar Hub)
        try {
            await Store.deleteMany({ id: { $ne: 'LBBPL' } });
            await Store.findOneAndUpdate(
                { id: 'LBBPL' },
                { 
                    id: 'LBBPL',
                    name: 'Ayodhya Nagar Hub',
                    branchCode: 'LBBPL',
                    manager: 'admin',
                    location: '7FMC+MG8, Housing Board Colony, Ayodhya Nagar, Arhedi, Bhopal, MP 462041',
                    mapUrl: 'https://maps.google.com/?q=7FMC%2BMG8+Ayodhya+Nagar+Bhopal',
                    lat: 23.2766,
                    lng: 77.4658,
                    approved: true,
                    status: 'Active'
                },
                { upsert: true, new: true }
            );
            console.log('🏬 Single Unified Store Initialized: Ayodhya Nagar Hub (LBBPL)');
        } catch (err) {
            console.error('Error enforcing single store:', err.message);
        }
        
        // Archive Old Orders (Pre-15 September historical orders only; NEVER active or LB1000+ orders)
        try {
            // Ensure any active orders or recent LB1000+ orders are ALWAYS active and visible
            await Order.updateMany(
                {
                    $or: [
                        { id: /^LBBPLAN/i },
                        { id: /^LB10/i },
                        { id: /^LBEV/i },
                        { status: { $in: ['Pending', 'Out for Pickup', 'Pickup Done', 'Delivered at Store', 'Washing', 'Drying', 'Ironing', 'Processing', 'Ready', 'Out for Delivery'] } }
                    ],
                    isLegacyOrder: true
                },
                { $set: { isLegacyOrder: false, archivedTag: null } }
            );

            // Ensure counter sequence is at least 1009
            const counters = await Counter.find({});
            for (const c of counters) {
                if (c.seq < 1009) {
                    await Counter.updateOne({ _id: c._id }, { $set: { seq: 1009 } });
                }
            }
        } catch (err) {
            console.error('Error setting up old order history archive:', err.message);
        }
        
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
                
                let xlsx;
                try { xlsx = require('xlsx'); } catch(e) { console.log('xlsx module not installed, skipping legacy importer'); }
                const excelPath = "C:/Users/viren/Downloads/ORDER LIST.xlsx";
                console.log(`Loading Excel from: ${excelPath}`);
                
                if (xlsx && fs.existsSync(excelPath)) {
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
    seq: { type: Number, default: 1000 }
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
    sourceSegment: { type: String, default: null }, // 'NP' (NewsPaper), 'SM' (Social Media), 'RF' (Reference), 'WS' (Website), 'AP' (App)

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
    discount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    distanceKm: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    isLegacyOrder: { type: Boolean, default: false },
    archivedTag: { type: String, default: null },
    pickupPhoto: { type: String, default: null },    // base64 image string uploaded by rider at pickup
    deliveryPhoto: { type: String, default: null },   // base64 image string uploaded by rider at delivery
    placedBy: { type: String, default: 'Customer' },
    pickupRiderId: { type: String, default: null },
    pickupRiderName: { type: String, default: null },
    deliveryRiderId: { type: String, default: null },
    deliveryRiderName: { type: String, default: null },
    appliedReferralCode: { type: String, default: null },
    referralDiscount: { type: Number, default: 0 },
    referralRewardClaimed: { type: Boolean, default: false },
    redeemedPoints: { type: Number, default: 0 },
    originStoreId: { type: String, default: null },
    virtualBranch: { type: String, default: null },
    paidTo3rdPartyRider: { type: Boolean, default: false },
    managerConfirmedAmount: { type: Boolean, default: false },
    amountChangeReason: { type: String, default: null }
});
OrderSchema.index({ storeId: 1, _id: -1 });
OrderSchema.index({ phone: 1 });
const Order = mongoose.model('Order', OrderSchema);

// --- Distance & Delivery Charge Calculation Logic ---
function calculateDeliveryFee(distanceKm, subtotal = 0) {
    const dist = parseFloat(distanceKm);
    if (isNaN(dist) || dist < 0) return { fee: 0, distanceKm: 0, tier: 'Free (< 3 KM)' };

    // Free delivery promotion for orders >= ₹500 up to 5 KM
    if (subtotal >= 500 && dist <= 5.0) {
        return { fee: 0, distanceKm: parseFloat(dist.toFixed(1)), tier: 'FREE (Order ≥ ₹500)' };
    }

    let fee = 0;
    let tier = 'Free (< 3 KM)';

    if (dist <= 3.0) {
        fee = 0;
        tier = 'Free (< 3 KM)';
    } else if (dist <= 5.0) {
        fee = 27;
        tier = '3-5 KM (₹27)';
    } else if (dist <= 8.0) {
        fee = 47;
        tier = '5-8 KM (₹47)';
    } else if (dist <= 12.0) {
        fee = 77;
        tier = '8-12 KM (₹77)';
    } else {
        const extraKm = Math.ceil(dist - 12);
        fee = 97 + (extraKm * 10);
        tier = `> 12 KM (₹${fee})`;
    }

    return {
        fee,
        distanceKm: parseFloat(dist.toFixed(1)),
        tier
    };
}

// Helper to parse service strings
function parseService(s) {
    const sTrim = String(s || '').trim();
    let name = sTrim;
    let qty = 1;
    let price = 0;
    
    let cleanStr = sTrim.replace(/^(Service|Product):\s*/i, '');
    
    // Format: "Service: Dry Cleaning - Shirt x2 (₹160)" or "Dry Cleaning - Shirt x2 (₹160)"
    const matchX = cleanStr.match(/(.*?)\s+x(\d+)\s*\(₹(\d+)\)(.*)/);
    if (matchX) {
        const baseName = matchX[1].trim();
        qty = parseInt(matchX[2]) || 1;
        price = parseInt(matchX[3]) || 0;
        name = baseName;
    } else {
        const matchPcs = cleanStr.match(/(.*?)\s*\((\d+)\s*pcs\)/i);
        if (matchPcs) {
            name = matchPcs[1].trim();
            qty = parseInt(matchPcs[2]) || 1;
        }
    }
    
    let serviceType = name;
    if (name.includes(' - ')) {
        serviceType = name.split(' - ')[0].trim();
    }
    
    return { name, qty, price, serviceType };
}

// Helper to attach repeat customer statistics
async function attachRepeatCustomerFlag(orders) {
    if (!orders || orders.length === 0) return orders;
    
    const phones = [...new Set(orders.map(o => o.phone).filter(Boolean))];
    if (phones.length === 0) {
        orders.forEach(o => {
            o.isRepeatCustomer = false;
            o.customerOrdersCount = 1;
        });
        return orders;
    }
    
    const counts = await Order.aggregate([
        { $match: { phone: { $in: phones } } },
        { $group: { _id: "$phone", count: { $sum: 1 } } }
    ]);
    
    const countMap = {};
    counts.forEach(c => {
        if (c._id) {
            countMap[c._id] = c.count;
        }
    });
    
    orders.forEach(o => {
        const count = countMap[o.phone] || 1;
        o.customerOrdersCount = count;
        o.isRepeatCustomer = count > 1;
    });
    
    return orders;
}

// 4. Store Schema
const StoreSchema = new mongoose.Schema({
    id: String,
    name: String,
    branchCode: { type: String, unique: true }, // e.g. IND, AN, BK
    manager: { type: String, unique: true }, // Username
    password: { type: String }, // Plain text or hash
    location: String,
    mapUrl: String,
    lat: { type: Number, default: 23.2766 }, // Ayodhya Nagar Hub (7FMC+MG8)
    lng: { type: Number, default: 77.4658 },
    approved: { type: Boolean, default: true },
    status: { type: String, default: 'Active' },
    ordersCount: { type: Number, default: 0 },
    googleAnalyticsId: { type: String, default: '' }
});
const Store = mongoose.model('Store', StoreSchema);

// Campaign Schema for Tracking Push Campaigns
const CampaignSchema = new mongoose.Schema({
    title: String,
    body: String,
    targetType: String,
    targetId: String,
    sentCount: Number,
    totalCount: Number,
    timestamp: { type: String, default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
});
const Campaign = mongoose.model('Campaign', CampaignSchema);

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
    phone: { type: String, unique: true, sparse: true },
    email: { type: String, sparse: true },
    googleId: { type: String, sparse: true },
    authProvider: { type: String, enum: ['phone', 'google'], default: 'phone' },
    name: { type: String },
    accountType: { type: String, default: 'Residential' },
    fcmToken: { type: String, default: null },
    timestamp: { type: String, default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
    profilePicture: { type: String, default: null },
    address: { type: String, default: '' },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: String, default: null },
    walletBalance: { type: Number, default: 0 },
    referralCount: { type: Number, default: 0 },
    sourceSegment: { type: String, default: null } // 'NP', 'SM', 'RF', 'WS', 'AP'
});
const Customer = mongoose.model('Customer', CustomerSchema);

// 10. Subscriber Schema (Newsletter)
const SubscriberSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: 'website' },
    subscribedAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
});
const Subscriber = mongoose.model('Subscriber', SubscriberSchema);

// 11. Expense Schema (P&L & Accounting)
const ExpenseSchema = new mongoose.Schema({
    storeId: { type: String, default: 'LBBPL' },
    date: { type: String, required: true }, // e.g. "02-09-2026" or "2026-09-02"
    month: { type: String, required: true }, // e.g. "Sep" or "09"
    year: { type: Number, required: true },  // 2026
    narration: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['opex', 'capex', 'funding'], default: 'opex' },
    subtype: { type: String, default: 'office expense' },
    paidBy: { type: String, default: 'Sarvesh' },
    paymentMode: { type: String, default: 'online' },
    note: { type: String, default: '' },
    timestamp: { type: String, default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
});
const Expense = mongoose.model('Expense', ExpenseSchema);

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
                    accountType: accountType || 'Residential',
                    sourceSegment: req.body.sourceSegment || null
                });
                await customer.save();
                isNewUser = true;
            } else if (name || accountType || req.body.sourceSegment) {
                if (name) customer.name = name;
                if (accountType) customer.accountType = accountType;
                if (req.body.sourceSegment) customer.sourceSegment = req.body.sourceSegment;
                await customer.save();
            }

            // --- Role Detection ---
            // Admin: phones listed in ADMIN_PHONES env var (comma-separated)
            const adminPhones = (process.env.ADMIN_PHONES || '').split(',').map(p => p.trim()).filter(Boolean);
            // Vendor: phones listed in VENDOR_PHONES env var (comma-separated)
            const vendorPhones = (process.env.VENDOR_PHONES || '').split(',').map(p => p.trim()).filter(Boolean);
            let userRole = 'customer';
            if (adminPhones.includes(cleanPhone)) {
                userRole = 'admin';
            } else if (vendorPhones.includes(cleanPhone)) {
                userRole = 'vendor';
            }

            if (!customer.referralCode) {
                customer.referralCode = await generateUniqueReferralCode(customer);
                await customer.save();
            }

            const token = jwt.sign({ 
                id: cleanPhone, 
                role: userRole, 
                name: customer.name, 
                accountType: customer.accountType,
                authProvider: customer.authProvider || 'phone'
            }, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.json({ token, role: userRole, name: customer.name, phone: cleanPhone, accountType: customer.accountType, profilePicture: customer.profilePicture, referralCode: customer.referralCode, sourceSegment: customer.sourceSegment || null, isNewUser });
        } else {
            res.status(401).json({ error: 'Invalid OTP' });
        }
    } catch (err) {
        console.error("MSG91 Verify Error:", err.response?.data || err.message);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});


// AUTH: Google Sign-In
app.post('/api/auth/google', async (req, res) => {
    const { idToken, accessToken } = req.body;
    if (!idToken && !accessToken) return res.status(400).json({ error: 'Token required' });

    try {
        let googleId, email, name, picture;

        if (idToken) {
            // Verify Google ID token
            const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
            googleId = googleRes.data.sub;
            email = googleRes.data.email;
            name = googleRes.data.name;
            picture = googleRes.data.picture;
        } else {
            // Verify Google Access token
            const googleRes = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
            googleId = googleRes.data.sub;
            email = googleRes.data.email;
            name = googleRes.data.name;
            picture = googleRes.data.picture;
        }

        if (!googleId || !email) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        // Find existing customer by googleId or email
        let customer = await Customer.findOne({ $or: [{ googleId }, { email }] });
        let isNewUser = false;

        if (customer) {
            // Update Google info if needed
            if (!customer.googleId) customer.googleId = googleId;
            if (!customer.email) customer.email = email;
            if (picture && !customer.profilePicture) customer.profilePicture = picture;
            if (name && !customer.name) customer.name = name;
            if (!customer.referralCode) customer.referralCode = await generateUniqueReferralCode(customer);
            await customer.save();
        } else {
            // New Google user — create without phone/address
            const tempReferralCode = await generateUniqueReferralCode({ name, phone: '' });
            customer = new Customer({
                email,
                googleId,
                name: name || '',
                authProvider: 'google',
                profilePicture: picture || null,
                referralCode: tempReferralCode
            });
            await customer.save();
            isNewUser = true;
        }

        const jwtId = customer.phone || customer.email;
        const token = jwt.sign({
            id: jwtId,
            role: 'customer',
            name: customer.name,
            accountType: customer.accountType,
            authProvider: 'google'
        }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email,
            address: customer.address || '',
            accountType: customer.accountType,
            profilePicture: customer.profilePicture,
            referralCode: customer.referralCode,
            sourceSegment: customer.sourceSegment || null,
            isNewUser,
            needsProfileSetup: !customer.phone || !customer.address || !customer.name
        });
    } catch (err) {
        console.error('Google Auth Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

// GET: Customer Profile
app.get('/api/customer/profile', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Customer only' });
    try {
        let customer;
        if (req.user.authProvider === 'google') {
            customer = await Customer.findOne({ $or: [{ email: req.user.id }, { phone: req.user.id.replace(/\D/g, '').slice(-10) }] });
        } else {
            const cleanPhone = req.user.id.replace(/\D/g, '').slice(-10);
            customer = await Customer.findOne({ phone: cleanPhone });
        }
        if (!customer) {
            return res.json({ phone: '', name: req.user.name || 'Laundry Basket User', profilePicture: null, accountType: 'Residential', address: '', sourceSegment: null });
        }
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Update Customer Profile
app.post('/api/customer/profile', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Customer only' });
    const { name, phone, address, accountType, profilePicture, sourceSegment } = req.body;
    try {
        let customer;
        if (req.user.authProvider === 'google') {
            customer = await Customer.findOne({ $or: [{ email: req.user.id }, { phone: req.user.id.replace(/\D/g, '').slice(-10) }] });
        } else {
            const cleanPhone = req.user.id.replace(/\D/g, '').slice(-10);
            customer = await Customer.findOne({ phone: cleanPhone });
        }
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        
        if (name) customer.name = name;
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '').slice(-10);
            const existingPhone = await Customer.findOne({ phone: cleanPhone });
            if (existingPhone && String(existingPhone._id) !== String(customer._id)) {
                return res.status(400).json({ error: 'Mobile number already registered to another account' });
            }
            customer.phone = cleanPhone;
        }
        if (address !== undefined) customer.address = address;
        if (accountType) customer.accountType = accountType;
        if (profilePicture !== undefined) customer.profilePicture = profilePicture;
        if (sourceSegment) customer.sourceSegment = sourceSegment;
        await customer.save();
        
        res.json({ success: true, customer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: All Orders (Role-based access - Active vs Legacy Old History)
app.get('/api/orders', verifyToken, async (req, res) => {
    try {
        let filter = {};
        if (req.query.history === '1' || req.query.isLegacy === '1') {
            filter.isLegacyOrder = true;
        } else {
            filter.isLegacyOrder = { $ne: true };
        }

        if (req.user.role === 'rider') filter.assignedRiderId = req.user.id;
        else if (req.user.role === 'manager') filter.storeId = req.user.id;
        else if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
        
        if (req.query.storeId && req.query.storeId !== 'all') {
            filter.storeId = req.query.storeId;
        }
        
        if (req.query.date) {
            const [year, month, day] = req.query.date.split('-');
            const dayInt = parseInt(day, 10);
            const monthInt = parseInt(month, 10);
            filter.timestamp = { $regex: `^0?${dayInt}/0?${monthInt}/${year}` };
        }

        const orders = await Order.find(filter).sort({ _id: -1 }).select('-events -__v').lean();
        const populatedOrders = await populateRidersDetails(orders);
        const finalOrders = await attachRepeatCustomerFlag(populatedOrders);
        return res.json(finalOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Dedicated Admin Old Order History (Legacy Archived Orders)
app.get('/api/admin/old-orders-history', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const oldOrders = await Order.find({ isLegacyOrder: true }).sort({ _id: -1 }).select('-events -__v').lean();
        const populatedOrders = await populateRidersDetails(oldOrders);
        const finalOrders = await attachRepeatCustomerFlag(populatedOrders);
        res.json(finalOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Customer's own active orders or Rider's assigned tasks
app.get('/api/orders/my-orders', verifyToken, async (req, res) => {
    try {
        if (req.user.role === 'customer') {
            const cleanPhone = req.user.id.replace(/\D/g, '').slice(-10);
            const orders = await Order.find({ 
                isLegacyOrder: { $ne: true },
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
            const orders = await Order.find({ assignedRiderId: req.user.id, isLegacyOrder: { $ne: true } }).sort({ _id: -1 }).select('-events -__v').lean();
            const populatedOrders = await populateRidersDetails(orders);
            return res.json(populatedOrders);
        } else {
            return res.status(403).json({ error: 'Access denied' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Orders by Store (Manager, Admin, or Rider - Active Only)
app.get('/api/orders/store/:storeId', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'rider' && req.user.id !== req.params.storeId) {
        return res.status(403).json({ error: 'Access denied to this store' });
    }
    try {
        const filter = { storeId: req.params.storeId, isLegacyOrder: { $ne: true } };
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
            const finalOrders = await attachRepeatCustomerFlag(populatedOrders);
            finalOrders.forEach(o => {
                const isRcv = String(o.paymentStatus || o.payment_status || '').toLowerCase().includes('received');
                const tot = Number(o.total || 0);
                if (o.pending_amount === undefined || o.pending_amount === null) {
                    o.pending_amount = isRcv ? 0 : tot;
                }
                if (o.received_amount === undefined || o.received_amount === null) {
                    o.received_amount = isRcv ? tot : 0;
                }
            });
            return res.json({
                orders: finalOrders,
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
        const finalOrders = await attachRepeatCustomerFlag(populatedOrders);
        finalOrders.forEach(o => {
            const isRcv = String(o.paymentStatus || o.payment_status || '').toLowerCase().includes('received');
            const tot = Number(o.total || 0);
            if (o.pending_amount === undefined || o.pending_amount === null) {
                o.pending_amount = isRcv ? 0 : tot;
            }
            if (o.received_amount === undefined || o.received_amount === null) {
                o.received_amount = isRcv ? tot : 0;
            }
        });
        res.json(finalOrders);
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
        const orderObj = populatedOrder.toObject ? populatedOrder.toObject() : populatedOrder;
        const [finalOrder] = await attachRepeatCustomerFlag([orderObj]);
        res.json(finalOrder);
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
        let customer;
        if (req.user.authProvider === 'google') {
            customer = await Customer.findOne({ $or: [{ email: req.user.id }, { phone: req.user.id.replace(/\D/g, '').slice(-10) }] });
        } else {
            const cleanPhone = req.user.id.replace(/\D/g, '').slice(-10);
            customer = await Customer.findOne({ phone: cleanPhone });
        }
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        customer.fcmToken = req.body.token;
        await customer.save();
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST: Calculate Delivery Fee by Distance in KM
app.post('/api/delivery/calculate', (req, res) => {
    const { distanceKm, subtotal } = req.body;
    const result = calculateDeliveryFee(distanceKm, subtotal);
    res.json(result);
});

// GET: Customer Lookup by Phone (for Rider, Manager, Admin to place orders on behalf of customer)
app.get('/api/customers/lookup', async (req, res) => {
    try {
        const rawPhone = req.query.phone || '';
        const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
        if (!cleanPhone || cleanPhone.length < 10) {
            return res.status(400).json({ error: 'Valid 10-digit phone number is required' });
        }

        const customer = await Customer.findOne({ phone: cleanPhone });
        const pastOrdersCount = await Order.countDocuments({ phone: new RegExp(cleanPhone + '$') });
        const lastOrder = await Order.findOne({ phone: new RegExp(cleanPhone + '$') }).sort({ _id: -1 });

        if (customer || lastOrder) {
            const rawAddr = (customer && customer.address) ? customer.address : (lastOrder ? lastOrder.address : '');
            const cleanAddr = (rawAddr && rawAddr !== 'Store Walk-in' && rawAddr !== 'Self Pickup') ? rawAddr : '';
            return res.json({
                found: true,
                phone: cleanPhone,
                name: (customer && customer.name) ? customer.name : (lastOrder ? lastOrder.name : ''),
                address: cleanAddr,
                accountType: (customer && customer.accountType) ? customer.accountType : (lastOrder ? (lastOrder.cx_type || lastOrder.accountType) : 'Residential'),
                pastOrders: pastOrdersCount,
                lastOrderDate: lastOrder ? lastOrder.timestamp : (customer ? customer.timestamp : ''),
                isRepeat: pastOrdersCount > 0
            });
        }

        return res.json({
            found: false,
            phone: cleanPhone
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Customer Search & Recent Repeat Customers (for Manager, Admin, Rider)
app.get('/api/customers/search', async (req, res) => {
    try {
        const query = String(req.query.q || '').trim();
        const limit = Math.min(parseInt(req.query.limit) || 10, 30);
        const cleanDigits = query.replace(/\D/g, '');

        let customersMap = new Map();

        if (query.length > 0) {
            // Search in Customer collection by name or phone
            const customerConditions = [];
            if (cleanDigits.length >= 3) {
                customerConditions.push({ phone: { $regex: cleanDigits, $options: 'i' } });
            }
            if (query.length >= 2) {
                customerConditions.push({ name: { $regex: query, $options: 'i' } });
            }

            if (customerConditions.length > 0) {
                const matchedCustomers = await Customer.find({ $or: customerConditions }).limit(limit).lean();
                for (const cx of matchedCustomers) {
                    if (!cx.phone) continue;
                    const cleanPhone = cx.phone.replace(/\D/g, '').slice(-10);
                    customersMap.set(cleanPhone, {
                        phone: cleanPhone,
                        name: cx.name || 'Customer',
                        address: (cx.address && cx.address !== 'Store Walk-in' && cx.address !== 'Self Pickup') ? cx.address : '',
                        accountType: cx.accountType || 'Residential',
                        orderCount: 0,
                        lastOrderDate: cx.timestamp || '',
                        isRepeat: false
                    });
                }
            }

            // Search in Order collection to catch all customers with order history
            const orderConditions = [];
            if (cleanDigits.length >= 3) {
                orderConditions.push({ phone: { $regex: cleanDigits, $options: 'i' } });
                orderConditions.push({ mobile_number: { $regex: cleanDigits, $options: 'i' } });
            }
            if (query.length >= 2) {
                orderConditions.push({ name: { $regex: query, $options: 'i' } });
                orderConditions.push({ customer_name: { $regex: query, $options: 'i' } });
            }

            if (orderConditions.length > 0) {
                const matchedOrders = await Order.aggregate([
                    { $match: { $or: orderConditions } },
                    { $sort: { _id: -1 } },
                    { $group: {
                        _id: "$phone",
                        name: { $first: "$name" },
                        address: { $first: "$address" },
                        accountType: { $first: "$accountType" },
                        cx_type: { $first: "$cx_type" },
                        lastOrderDate: { $first: "$timestamp" },
                        orderCount: { $sum: 1 }
                    }},
                    { $sort: { orderCount: -1 } },
                    { $limit: limit }
                ]);

                for (const ord of matchedOrders) {
                    if (!ord._id) continue;
                    const cleanPhone = String(ord._id).replace(/\D/g, '').slice(-10);
                    if (!cleanPhone || cleanPhone.length < 10) continue;

                    const existing = customersMap.get(cleanPhone) || {};
                    const cleanAddr = (ord.address && ord.address !== 'Store Walk-in' && ord.address !== 'Self Pickup') ? ord.address : (existing.address || '');
                    customersMap.set(cleanPhone, {
                        phone: cleanPhone,
                        name: existing.name && existing.name !== 'Customer' ? existing.name : (ord.name || 'Customer'),
                        address: cleanAddr,
                        accountType: existing.accountType || ord.cx_type || ord.accountType || 'Residential',
                        orderCount: ord.orderCount || 1,
                        lastOrderDate: ord.lastOrderDate || existing.lastOrderDate || '',
                        isRepeat: (ord.orderCount || 1) > 1
                    });
                }
            }
        } else {
            // When query is empty, return top frequent & recent customers from Orders
            const recentRepeatCx = await Order.aggregate([
                { $match: { phone: { $exists: true, $ne: '' } } },
                { $sort: { _id: -1 } },
                { $group: {
                    _id: "$phone",
                    name: { $first: "$name" },
                    address: { $first: "$address" },
                    accountType: { $first: "$accountType" },
                    cx_type: { $first: "$cx_type" },
                    lastOrderDate: { $first: "$timestamp" },
                    orderCount: { $sum: 1 }
                }},
                { $sort: { orderCount: -1, _id: -1 } },
                { $limit: limit }
            ]);

            for (const ord of recentRepeatCx) {
                if (!ord._id) continue;
                const cleanPhone = String(ord._id).replace(/\D/g, '').slice(-10);
                if (!cleanPhone || cleanPhone.length < 10) continue;

                const cleanAddr = (ord.address && ord.address !== 'Store Walk-in' && ord.address !== 'Self Pickup') ? ord.address : '';
                customersMap.set(cleanPhone, {
                    phone: cleanPhone,
                    name: ord.name || 'Customer',
                    address: cleanAddr,
                    accountType: ord.cx_type || ord.accountType || 'Residential',
                    orderCount: ord.orderCount || 1,
                    lastOrderDate: ord.lastOrderDate || '',
                    isRepeat: (ord.orderCount || 1) > 1
                });
            }
        }

        // For any customers from Customer collection without orderCount computed, fetch their counts
        const results = Array.from(customersMap.values());
        for (const item of results) {
            if (item.orderCount === 0) {
                item.orderCount = await Order.countDocuments({ phone: new RegExp(item.phone + '$') });
                item.isRepeat = item.orderCount > 1;
                if (!item.lastOrderDate) {
                    const last = await Order.findOne({ phone: new RegExp(item.phone + '$') }).sort({ _id: -1 }).select('timestamp');
                    if (last && last.timestamp) item.lastOrderDate = last.timestamp;
                }
            }
        }

        // Sort results: highest orderCount first, then alphabetical
        results.sort((a, b) => (b.orderCount - a.orderCount));

        res.json({
            count: results.length,
            customers: results.slice(0, limit)
        });
    } catch (err) {
        console.error('Customer Search Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- REFER & EARN HELPERS & ENDPOINTS ---
async function generateUniqueReferralCode(customer) {
    let base = 'LB';
    if (customer && customer.name && customer.name.trim().length >= 2) {
        base = customer.name.trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        if (base.length < 2) base = 'LB';
    }
    const cleanPhone = (customer && customer.phone) ? String(customer.phone).replace(/\D/g, '').slice(-4) : '';
    let code = `${base}${cleanPhone || Math.floor(1000 + Math.random() * 9000)}`;

    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 30) {
        attempts++;
        const existing = await Customer.findOne({ referralCode: code });
        if (!existing || (customer && customer._id && String(existing._id) === String(customer._id))) {
            isUnique = true;
        } else {
            code = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
        }
    }
    return code;
}

// GET: Customer Referral Details & Stats
app.get('/api/referral/details', verifyToken, async (req, res) => {
    try {
        let customer;
        if (req.user.authProvider === 'google') {
            customer = await Customer.findOne({ $or: [{ email: req.user.id }, { phone: req.user.id.replace(/\D/g, '').slice(-10) }] });
        } else {
            const cleanPhone = req.user.id.replace(/\D/g, '').slice(-10);
            customer = await Customer.findOne({ phone: cleanPhone });
        }

        if (!customer) {
            return res.status(404).json({ error: 'Customer account not found' });
        }

        // Generate referral code if not already assigned
        if (!customer.referralCode) {
            customer.referralCode = await generateUniqueReferralCode(customer);
            await customer.save();
        }

        // Fetch referred orders
        const referredOrders = await Order.find({ appliedReferralCode: customer.referralCode })
            .select('id name status total timestamp referralRewardClaimed')
            .sort({ _id: -1 })
            .limit(20);

        const successfulCount = referredOrders.filter(o => o.status === 'Delivered to Cx' || o.status === 'Completed').length;

        const friendsList = referredOrders.map(o => {
            const rawName = o.name || 'Friend';
            const maskedName = rawName.length > 2 ? `${rawName.substring(0, 2)}***` : rawName;
            const isCompleted = o.status === 'Delivered to Cx' || o.status === 'Completed';
            return {
                orderId: o.id,
                name: maskedName,
                status: isCompleted ? 'Reward Credited (+₹100)' : `In Progress (${o.status})`,
                isCompleted,
                date: o.timestamp || 'Recent'
            };
        });

        res.json({
            referralCode: customer.referralCode,
            shareUrl: `https://www.laundrybasketunicorn.com/?ref=${customer.referralCode}`,
            points: customer.walletBalance || 0,
            walletBalance: customer.walletBalance || 0,
            successfulReferrals: customer.referralCount || successfulCount,
            totalEarned: (customer.referralCount || successfulCount) * 100,
            rules: {
                pointsPerReferral: 100,
                friendDiscount: 100,
                minRedeemPoints: 100,
                maxRedeemPoints: 100,
                discountPer100Points: 100,
                eligibleService: 'Dry Cleaning',
                minOrderValue: 349,
                rewardTrigger: 'Points credited after referred friend places first order and delivery is successfully completed'
            },
            termsAndConditions: [
                "Give ₹100, Get 100: Your referred friend receives Flat ₹100 OFF on their first order, and you earn Flat 100 Reward Points (worth ₹100).",
                "Minimum & Maximum Discount: Exactly 100 points (worth ₹100) can be redeemed per eligible Dry Cleaning order. Partial redemptions (under 100) or multiple redemptions (over 100) on a single order are not permitted.",
                "Points are credited only AFTER the referred friend's first order is successfully Delivered to Cx.",
                "Referral points can ONLY be redeemed on Dry Cleaning services. Points are not valid on Wash & Fold or Steam Press.",
                "A minimum order value of ₹349 on Dry Cleaning is mandatory to redeem points.",
                "Points are non-transferable and cannot be converted or exchanged for cash.",
                "Orders cancelled or returned will not qualify for referral reward points.",
                "Self-referral or fraudulent use will lead to immediate cancellation of points and account suspension."
            ],
            friendsList
        });
    } catch (err) {
        console.error('Referral Details Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST: Validate Referral Code (applied during booking / checkout)
app.post('/api/referral/validate', async (req, res) => {
    try {
        const code = req.body.code || req.body.referralCode;
        const phone = req.body.phone;
        if (!code || !String(code).trim()) {
            return res.status(400).json({ valid: false, message: 'Please enter a referral code' });
        }

        const cleanCode = String(code).trim().toUpperCase();

        // Built-in promotional voucher codes
        if (cleanCode === 'LAUNDRY50' || cleanCode === 'WELCOME50') {
            return res.json({
                valid: true,
                code: cleanCode,
                discount: 50,
                discountAmount: 50,
                referrerName: 'Special Offer',
                message: 'Promotional code applied! Flat ₹50 OFF on your order.'
            });
        }
        if (cleanCode === 'FRIEND100' || cleanCode === 'LAUNDRY100' || cleanCode === 'WELCOME100') {
            return res.json({
                valid: true,
                code: cleanCode,
                discount: 100,
                discountAmount: 100,
                referrerName: 'Special Offer',
                message: 'Promotional code applied! Flat ₹100 OFF on your order.'
            });
        }

        const referrer = await Customer.findOne({ referralCode: cleanCode });
        if (!referrer) {
            return res.status(404).json({ valid: false, message: 'Invalid referral code' });
        }

        // Check if user is referring themselves
        if (phone) {
            const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
            if (referrer.phone && referrer.phone === cleanPhone) {
                return res.status(400).json({ valid: false, message: 'You cannot use your own referral code' });
            }

            // Check if user has already placed orders
            const pastOrdersCount = await Order.countDocuments({ phone: new RegExp(cleanPhone + '$') });
            if (pastOrdersCount > 0) {
                return res.status(400).json({ valid: false, message: 'Referral codes are only valid for your first order' });
            }
        }

        res.json({
            valid: true,
            code: cleanCode,
            discount: 100,
            discountAmount: 100,
            referrerName: referrer.name ? referrer.name.split(' ')[0] : 'a friend',
            message: 'Referral code applied! You get ₹100 OFF on your first order.'
        });
    } catch (err) {
        res.status(500).json({ valid: false, error: err.message });
    }
});

// POST: Validate Dry Cleaning Points Redemption (Fixed 100 points = ₹100, Min ₹349, Dry Cleaning only)
app.post('/api/referral/validate-points', verifyToken, async (req, res) => {
    try {
        const { services, subtotal, points: requestedPoints } = req.body;

        // Strictly enforce that minimum & maximum points that can be redeemed is 100
        if (requestedPoints !== undefined && Number(requestedPoints) !== 100) {
            return res.status(400).json({
                valid: false,
                message: 'Minimum and maximum discount is fixed at exactly 100 points for ₹100.'
            });
        }

        let customer;
        if (req.user.authProvider === 'google') {
            customer = await Customer.findOne({ $or: [{ email: req.user.id }, { phone: req.user.id.replace(/\D/g, '').slice(-10) }] });
        } else {
            const cleanPhone = req.user.id.replace(/\D/g, '').slice(-10);
            customer = await Customer.findOne({ phone: cleanPhone });
        }

        if (!customer) return res.status(404).json({ valid: false, message: 'Customer not found' });

        const points = customer.walletBalance || 0;
        if (points < 100) {
            return res.status(400).json({
                valid: false,
                message: `Insufficient points. You have ${points} points (minimum and maximum 100 points required to redeem ₹100 discount).`
            });
        }

        // Check if order contains Dry Cleaning
        const serviceList = Array.isArray(services) ? services : [services].filter(Boolean);
        const hasDryCleaning = serviceList.some(s => /dry\s*clean/i.test(String(s)));

        if (!hasDryCleaning) {
            return res.status(400).json({
                valid: false,
                message: 'Referral points are strictly usable for Dry Cleaning services only.'
            });
        }

        // Check Minimum Order Value (₹349)
        const numSubtotal = Number(subtotal) || 0;
        if (numSubtotal < 349) {
            return res.status(400).json({
                valid: false,
                message: 'Minimum order value of ₹349 on Dry Cleaning is required to redeem points.'
            });
        }

        res.json({
            valid: true,
            minPoints: 100,
            maxPoints: 100,
            redeemPoints: 100,
            discount: 100,
            remainingPoints: points - 100,
            message: '🎉 100 Dry Cleaning Points Applied! Flat ₹100 OFF.'
        });
    } catch (err) {
        res.status(500).json({ valid: false, error: err.message });
    }
});

// POST: Create New Order
app.post('/api/orders', async (req, res) => {
    try {
        // 🏬 CENTRAL ORDER ROUTING: All incoming orders land on Ayodhya Nagar Hub (Flagship - LBBPL)
        const incomingStoreId = req.body.storeId || 'LBBPL';
        const finalStoreId = 'LBBPL'; // Primary central fulfilling hub
        const virtualStore = await Store.findOne({ id: incomingStoreId });
        const originStoreId = incomingStoreId;
        const virtualBranch = virtualStore ? virtualStore.name : (req.body.virtualBranch || incomingStoreId);

        const store = await Store.findOne({ id: finalStoreId });
        let branchCode = store ? (store.branchCode || 'LBBPL') : 'LBBPL';        
        
        // Fetch customer to check account type if not provided
        let isHotel = req.body.accountType === 'Hotel';
        if (!isHotel && req.body.phone) {
            const cleanPhone = String(req.body.phone).replace(/\D/g, '').slice(-10);
            if (cleanPhone) {
                const customer = await Customer.findOne({ phone: cleanPhone });
                if (customer && customer.accountType === 'Hotel') {
                    isHotel = true;
                }
            }
        }
        
        if (isHotel) {
            branchCode += 'H';
        }
        
        let cxType = req.body.cx_type || req.body.accountType;
        if (!cxType && req.body.phone) {
            const cleanPhone = String(req.body.phone).replace(/\D/g, '').slice(-10);
            if (cleanPhone) {
                const customer = await Customer.findOne({ phone: cleanPhone });
                if (customer) {
                    cxType = customer.accountType;
                }
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
            let initialSeq = 1001;

            let counter = await Counter.findOne({ id: counterId });
            if (!counter) {
                counter = new Counter({ id: counterId, seq: initialSeq });
                await counter.save();
            } else if (counter.seq < initialSeq) {
                counter = await Counter.findOneAndUpdate(
                    { id: counterId },
                    { $set: { seq: initialSeq } },
                    { new: true }
                );
            }

            // Ensure unique orderId that doesn't collide with existing DB orders
            let isUnique = false;
            while (!isUnique) {
                counter = await Counter.findOneAndUpdate(
                    { id: counterId },
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                );
                if (isBusiness) {
                    const seqPadded = String(counter.seq).padStart(6, '0');
                    orderId = `LBB${storeName}${seqPadded}`;
                } else {
                    orderId = `LBBPLAN${counter.seq}`;
                }
                const existing = await Order.findOne({ id: orderId });
                if (!existing) {
                    isUnique = true;
                }
            }
        }
        // If Walk-in or WhatsApp order, completely remove pickup and delivery OTP feature
        const orderSource = (req.body.source || '').toLowerCase();
        const isWalkInOrWhatsapp = orderSource.includes('walk-in') || orderSource.includes('whatsapp') ||
                                   (req.body.order_type && ['walk-in', 'whatsapp'].includes(req.body.order_type.toLowerCase()));

        const generatedPickupCode = isWalkInOrWhatsapp ? null : String(Math.floor(1000 + Math.random() * 9000));
        const generatedDeliveryCode = isWalkInOrWhatsapp ? null : String(Math.floor(1000 + Math.random() * 9000));

        // Determine customer acquisition source segment (NP, SM, RF, WS, AP)
        let finalSourceSegment = req.body.sourceSegment || null;
        if (!finalSourceSegment && req.body.phone) {
            try {
                const cleanPh = req.body.phone.replace(/\D/g, '').slice(-10);
                const cxRecord = await Customer.findOne({ phone: cleanPh });
                if (cxRecord && cxRecord.sourceSegment) {
                    finalSourceSegment = cxRecord.sourceSegment;
                }
            } catch (e) {}
        }
        if (!finalSourceSegment) {
            if (orderSource.includes('app')) finalSourceSegment = 'AP';
            else if (orderSource.includes('web')) finalSourceSegment = 'WS';
            else if (orderSource.includes('whatsapp')) finalSourceSegment = 'SM';
            else if (orderSource.includes('walk-in')) finalSourceSegment = 'RF';
        }

        // Delivery Charge & Distance Calculation - Safe Numeric Parsing
        const distanceKm = Number(req.body.distanceKm) || 0;
        const rawSubtotal = Number(req.body.subtotal) || Number(req.body.total) || 0;
        const subtotal = isNaN(rawSubtotal) ? 0 : rawSubtotal;
        const deliveryCalc = calculateDeliveryFee(distanceKm, subtotal);
        const rawDeliveryFee = req.body.deliveryFee !== undefined ? Number(req.body.deliveryFee) : deliveryCalc.fee;
        const deliveryFee = isNaN(rawDeliveryFee) ? 0 : rawDeliveryFee;
        const rawFinalTotal = req.body.total !== undefined ? Number(req.body.total) : (subtotal + deliveryFee);
        const finalTotal = isNaN(rawFinalTotal) ? (subtotal + deliveryFee) : rawFinalTotal;

        const isRiderPlacement = req.body.placedBy === 'rider' || Boolean(req.body.pickupRiderId);
        const orderStatus = req.body.status || 'Pending';
        const isDirectPickup = orderStatus === 'Pickup Done' || orderStatus === 'Picked Up';

        let initialEvents = req.body.events;
        if (!initialEvents || !Array.isArray(initialEvents) || initialEvents.length === 0) {
            initialEvents = [{ status: 'Pending', time: new Date().toLocaleTimeString() }];
            if (isDirectPickup) {
                initialEvents.push({ 
                    status: 'Pickup Done', 
                    time: new Date().toLocaleTimeString(), 
                    note: req.body.pickupRiderName ? `Picked up by Rider ${req.body.pickupRiderName}` : 'Picked up on the spot' 
                });
            }
        }

        const rawPayStatus = req.body.paymentStatus || req.body.payment_status || 'Pending';
        const isPaymentReceived = String(rawPayStatus).toLowerCase().includes('received');
        const resolvedPayStatus = isPaymentReceived ? 'Received' : 'Pending';
        const pendingAmount = req.body.pending_amount !== undefined ? Number(req.body.pending_amount) : (isPaymentReceived ? 0 : finalTotal);
        const receivedAmount = req.body.received_amount !== undefined ? Number(req.body.received_amount) : (isPaymentReceived ? finalTotal : 0);

        const orderData = {
            ...req.body,
            storeId: finalStoreId,
            originStoreId: originStoreId,
            virtualBranch: virtualBranch,
            id: orderId,
            cx_type: cxType,
            subtotal: subtotal,
            distanceKm: distanceKm,
            deliveryFee: deliveryFee,
            total: finalTotal,
            status: orderStatus,
            paymentStatus: resolvedPayStatus,
            payment_status: resolvedPayStatus,
            paymentMode: req.body.paymentMode || req.body.payment_mode || (isPaymentReceived ? 'Cash' : null),
            payment_mode: req.body.paymentMode || req.body.payment_mode || (isPaymentReceived ? 'Cash' : null),
            pending_amount: pendingAmount,
            received_amount: receivedAmount,
            received_date: isPaymentReceived ? (req.body.received_date || new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })) : null,
            received_month: isPaymentReceived ? (req.body.received_month || new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })) : null,
            pickupCode: isWalkInOrWhatsapp ? null : (req.body.pickupCode || generatedPickupCode),
            deliveryCode: isWalkInOrWhatsapp ? null : (req.body.deliveryCode || generatedDeliveryCode),
            sourceSegment: finalSourceSegment,
            pickupPhoto: req.body.pickupPhoto || null,
            placedBy: req.body.placedBy || (isRiderPlacement ? 'rider' : 'Customer'),
            pickupRiderId: req.body.pickupRiderId || null,
            pickupRiderName: req.body.pickupRiderName || null,
            timestamp: req.body.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            events: initialEvents,
            // Always sync name <-> customer_name and phone <-> mobile_number so all panels show consistent data
            customer_name: req.body.customer_name || req.body.name || '',
            name: req.body.name || req.body.customer_name || '',
            mobile_number: String(req.body.mobile_number || req.body.phone || ''),
            phone: String(req.body.phone || req.body.mobile_number || ''),
            customer_id: req.body.customer_id || orderId,
            order_date: req.body.order_date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        };

        // Collision-proof saving with automatic retry if duplicate key occurs
        let newOrder;
        let saved = false;
        let attempts = 0;
        while (!saved && attempts < 5) {
            try {
                attempts++;
                newOrder = new Order(orderData);
                await newOrder.save();
                saved = true;
            } catch (saveErr) {
                if (saveErr.code === 11000 && attempts < 5) {
                    console.warn(`Order ID collision on ${orderData.id}, generating next ID...`);
                    const counterId = isBusiness ? `order_id_${branchCode}_bus` : `order_id_${branchCode}_res`;
                    const nextCounter = await Counter.findOneAndUpdate(
                        { id: counterId },
                        { $inc: { seq: 1 } },
                        { new: true, upsert: true }
                    );
                    orderData.id = isBusiness 
                        ? `LBB${storeName}${String(nextCounter.seq).padStart(6, '0')}` 
                        : `LB${nextCounter.seq}`;
                    orderId = orderData.id;
                } else {
                    throw saveErr;
                }
            }
        }

        const orderObj = newOrder.toObject();
        const cleanPhoneNum = orderObj.phone ? String(orderObj.phone).replace(/\D/g, '').slice(-10) : '';
        let isRepeat = false;
        let ordersCountForUser = 1;
        if (cleanPhoneNum) {
            ordersCountForUser = await Order.countDocuments({ phone: cleanPhoneNum });
            isRepeat = ordersCountForUser > 1;

            // Ensure Customer record exists in DB for future logins & profile
            try {
                let customer = await Customer.findOne({ phone: cleanPhoneNum });
                if (!customer) {
                    const tempRefCode = await generateUniqueReferralCode({ name: orderObj.name, phone: cleanPhoneNum });
                    customer = new Customer({
                        phone: cleanPhoneNum,
                        name: orderObj.name || '',
                        accountType: cxType || 'Residential',
                        authProvider: 'phone',
                        referralCode: tempRefCode
                    });
                    await customer.save();
                } else if (!customer.referralCode) {
                    customer.referralCode = await generateUniqueReferralCode(customer);
                    if (!customer.name && orderObj.name) customer.name = orderObj.name;
                    await customer.save();
                } else if (!customer.name && orderObj.name) {
                    customer.name = orderObj.name;
                    await customer.save();
                }
            } catch (custErr) {
                console.warn('Customer upsert from order failed:', custErr.message);
            }

            // Deduct redeemed Dry Cleaning points if applied (Fixed Min & Max: 100 points for ₹100)
            const rawRedeemed = parseInt(req.body.redeemedPoints) || 0;
            const redeemedPoints = rawRedeemed > 0 ? 100 : 0;
            if (redeemedPoints === 100) {
                try {
                    const customer = await Customer.findOne({ phone: cleanPhoneNum });
                    if (customer && (customer.walletBalance || 0) >= 100) {
                        customer.walletBalance = Math.max(0, (customer.walletBalance || 0) - 100);
                        await customer.save();
                        if (req.io) {
                            req.io.to(`customer_${cleanPhoneNum}`).emit('wallet_updated', {
                                walletBalance: customer.walletBalance,
                                message: `Redeemed 100 points for ₹100 Dry Cleaning discount!`
                            });
                        }
                    }
                } catch (pErr) {
                    console.warn('Points deduction error:', pErr.message);
                }
            }
        }
        orderObj.isRepeatCustomer = isRepeat;
        orderObj.customerOrdersCount = ordersCountForUser;

        if (req.io) {
            req.io.emit("order_created", orderObj);
            if (isDirectPickup) {
                req.io.emit("order_status_updated", { id: orderObj.id, status: orderObj.status, order: orderObj });
            }
            // Broadcast to admin dashboard
            req.io.to('dashboard_monitors').emit('new_order_received', {
                message: isDirectPickup ? `Direct pickup ${orderId} created by rider!` : `New order ${orderId} received!`,
                order: orderObj
            });
            // Broadcast to customer room
            if (orderObj.phone) {
                const cleanPhone = String(orderObj.phone).replace(/\D/g, '').slice(-10);
                if (cleanPhone) {
                    req.io.to(`customer_${cleanPhone}`).emit('order_created', {
                        message: isDirectPickup 
                            ? `Your laundry order ${orderId} was collected by ${orderObj.pickupRiderName || 'our rider'}!` 
                            : `Your order ${orderId} has been placed!`,
                        order: orderObj
                    });
                }
            }
        }

        // ☁️ Sync to Firestore (mobile app real-time)
        syncToFirestore('orders', orderObj.id, orderObj);

        // 🔔 NOTIFY MANAGER (Store Room)
        sendNotification({
            topic: `store_${finalStoreId}`,
            title: isDirectPickup ? "🧺 On-the-spot Pickup Created!" : "🧺 New Order Received!",
            body: isDirectPickup 
                ? `Order ${orderId} picked up by ${orderObj.pickupRiderName || 'rider'} for ${orderObj.name}`
                : `Order ${orderId} has been placed at your branch.`,
            data: { orderId, type: 'new_order', total: String(orderObj.total), status: String(orderObj.status) }
        });

        // 🔔 NOTIFY RIDERS (Store Riders Room - only if not already picked up)
        if (!isDirectPickup) {
            sendNotification({
                topic: `riders_store_${finalStoreId}`,
                title: "🛵 New Pickup Available!",
                body: `Order ${orderId} | ${orderObj.name} | Loc: ${orderObj.address}`,
                data: { 
                    orderId, 
                    type: 'new_pickup_available',
                    name: String(orderObj.name),
                    phone: String(orderObj.phone),
                    address: String(orderObj.address),
                    info: String(Array.isArray(orderObj.services) ? orderObj.services.join(', ') : orderObj.services || '')
                }
            });
            
            if (req.io) {
                req.io.to(`riders_store_${finalStoreId}`).emit('new_task_assigned', {
                    message: `New pickup available for ${orderObj.name}`,
                    order: orderObj
                });
            }
        }

        res.status(201).json(orderObj);
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(400).json({ error: err.message || 'Failed to create order' });
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

        const oldStoreId = order.storeId;
        const newStoreId = req.body.storeId;
        const isTransfer = newStoreId && newStoreId !== oldStoreId;

        const updateData = { ...req.body };
        // Sync name <-> customer_name and phone <-> mobile_number on updates too
        if (req.body.name && !req.body.customer_name) updateData.customer_name = req.body.name;
        if (req.body.customer_name && !req.body.name) updateData.name = req.body.customer_name;
        if (req.body.phone && !req.body.mobile_number) updateData.mobile_number = String(req.body.phone);
        if (req.body.mobile_number && !req.body.phone) updateData.phone = String(req.body.mobile_number);
        if (req.body.total !== undefined) {
            const newTotal = Number(req.body.total) || 0;
            updateData.total = newTotal;
            updateData.commission = Math.round(newTotal * 0.05);
            updateData.netEarning = newTotal - updateData.commission;
            if (updateData.subtotal === undefined) {
                updateData.subtotal = newTotal;
            }
        }

        if (req.body.paymentStatus || req.body.payment_status) {
            const rawStatus = req.body.paymentStatus || req.body.payment_status;
            const isRcv = String(rawStatus).toLowerCase().includes('received');
            const resolvedStatus = isRcv ? 'Received' : 'Pending';
            updateData.paymentStatus = resolvedStatus;
            updateData.payment_status = resolvedStatus;
            const orderTotal = Number(req.body.total !== undefined ? req.body.total : order.total) || 0;
            if (updateData.pending_amount === undefined) {
                updateData.pending_amount = isRcv ? 0 : orderTotal;
            }
            if (updateData.received_amount === undefined) {
                updateData.received_amount = isRcv ? orderTotal : 0;
            }
            if (isRcv) {
                if (!updateData.received_date) {
                    updateData.received_date = req.body.received_date || new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
                }
                if (!updateData.received_month) {
                    updateData.received_month = req.body.received_month || new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
                }
            } else {
                updateData.received_date = null;
                updateData.received_month = null;
            }
        }
        const eventsToPush = [];
        if (req.body.status) {
            eventsToPush.push({ status: req.body.status });
        }
        if (req.body.managerConfirmedAmount && req.body.total !== undefined) {
            eventsToPush.push({ status: `Amount updated to ₹${req.body.total} (Confirmed by Manager)` });
        }
        if (isTransfer) {
            const oldStore = await Store.findOne({ id: oldStoreId });
            const newStore = await Store.findOne({ id: newStoreId });
            const oldName = oldStore ? oldStore.name : oldStoreId;
            const newName = newStore ? newStore.name : newStoreId;
            eventsToPush.push({ status: `Transferred from ${oldName} to ${newName}` });
        }

        if (eventsToPush.length > 0) {
            updateData.$push = { events: { $each: eventsToPush } };
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

        if (isTransfer) {
            req.io.to(`store_${oldStoreId}`).emit('order_status_updated', {
                message: `Order ${updatedOrder.id} transferred out`,
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

        // Referral Reward Disbursement (₹100 to Referrer on completed order)
        if ((updatedOrder.status === 'Delivered to Cx' || updatedOrder.status === 'Completed') && 
            updatedOrder.appliedReferralCode && 
            !updatedOrder.referralRewardClaimed) {
            try {
                const referrer = await Customer.findOne({ referralCode: updatedOrder.appliedReferralCode });
                if (referrer) {
                    referrer.walletBalance = (referrer.walletBalance || 0) + 100;
                    referrer.referralCount = (referrer.referralCount || 0) + 1;
                    await referrer.save();

                    await Order.findOneAndUpdate(
                        { id: updatedOrder.id },
                        { $set: { referralRewardClaimed: true } }
                    );

                    if (referrer.fcmToken) {
                        sendNotification({
                            token: referrer.fcmToken,
                            title: "🎉 100 Dry Cleaning Points Credited!",
                            body: `Your friend ${updatedOrder.name || 'friend'} completed their first order and delivery was successful. 100 points added to your account! Usable on Dry Cleaning (Min ₹349).`,
                            data: { type: 'referral_reward', amount: '100', service: 'Dry Cleaning' }
                        });
                    }
                    if (referrer.phone) {
                        req.io.to(`customer_${referrer.phone}`).emit('wallet_updated', {
                            walletBalance: referrer.walletBalance,
                            message: `🎉 100 Dry Cleaning points credited after successful delivery! (Usable on Dry Cleaning, Min order ₹349)`
                        });
                    }
                }
            } catch (refErr) {
                console.warn('Referral reward processing error:', refErr.message);
            }
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


// POST: Upload Pickup or Delivery Photo (Rider)
// Body: { type: 'pickup' | 'delivery', photo: '<base64 string>' }
app.post('/api/orders/:orderId/photo', verifyToken, async (req, res) => {
    try {
        if (!['rider', 'manager', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized to upload photos' });
        }
        const { type, photo } = req.body;
        if (!type || !photo) return res.status(400).json({ error: 'type and photo are required' });
        if (!['pickup', 'delivery'].includes(type)) return res.status(400).json({ error: 'type must be pickup or delivery' });

        const fieldName = type === 'pickup' ? 'pickupPhoto' : 'deliveryPhoto';
        const order = await Order.findOneAndUpdate(
            { id: req.params.orderId },
            { $set: { [fieldName]: photo } },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Emit real-time update so manager/admin panels refresh
        req.io.emit('order_photo_uploaded', {
            orderId: req.params.orderId,
            type,
            uploadedBy: req.user.id,
            timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        });

        res.json({ success: true, message: `${type} photo saved`, orderId: req.params.orderId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Fetch pickup/delivery photos for an order (Customer, Manager, Admin)
app.get('/api/orders/:orderId/photos', verifyToken, async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.orderId }, 'id pickupPhoto deliveryPhoto status');
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({
            orderId: order.id,
            status: order.status,
            pickupPhoto: order.pickupPhoto || null,
            deliveryPhoto: order.deliveryPhoto || null
        });
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
            const dayInt = parseInt(day, 10);
            const monthInt = parseInt(month, 10);
            filter.timestamp = { $regex: `^0?${dayInt}/0?${monthInt}/${year}` };
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

// --- P&L & EXPENSES API ---

// GET: Expenses List
app.get('/api/expenses', verifyToken, async (req, res) => {
    try {
        let filter = {};
        if (req.query.storeId && req.query.storeId !== 'all') filter.storeId = req.query.storeId;
        if (req.query.year) filter.year = parseInt(req.query.year, 10);
        if (req.query.month) {
            const m = String(req.query.month).trim();
            // Match month names like 'Sep' or numeric like '9' or '09'
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const mNum = parseInt(m, 10);
            if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
                filter.$or = [{ month: monthNames[mNum - 1] }, { month: String(mNum) }, { month: String(mNum).padStart(2, '0') }];
            } else {
                filter.month = new RegExp(`^${m}$`, 'i');
            }
        }
        if (req.query.type) filter.type = req.query.type;

        const expenses = await Expense.find(filter).sort({ _id: -1 }).lean();
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Add Expense (single or bulk)
app.post('/api/expenses', verifyToken, async (req, res) => {
    try {
        if (Array.isArray(req.body)) {
            const created = await Expense.insertMany(req.body);
            return res.json({ message: `Successfully added ${created.length} expenses`, expenses: created });
        }
        const expense = new Expense(req.body);
        await expense.save();
        res.status(201).json(expense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT: Update Expense
app.put('/api/expenses/:id', verifyToken, async (req, res) => {
    try {
        const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Expense not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Remove Expense
app.delete('/api/expenses/:id', verifyToken, async (req, res) => {
    try {
        const deleted = await Expense.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Expense not found' });
        res.json({ message: 'Expense deleted successfully', id: req.params.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Comprehensive P&L Statement
app.get('/api/pnl', verifyToken, async (req, res) => {
    try {
        const year = parseInt(req.query.year || new Date().getFullYear(), 10);
        const mInput = req.query.month || (new Date().getMonth() + 1);
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        let mIdx = 0;
        let mName = 'Sep';

        if (typeof mInput === 'string' && isNaN(parseInt(mInput, 10))) {
            mName = mInput.slice(0, 3);
            mIdx = monthNames.findIndex(mn => mn.toLowerCase() === mName.toLowerCase());
            if (mIdx === -1) mIdx = 8; // default to Sep
        } else {
            const mNum = parseInt(mInput, 10);
            mIdx = (mNum >= 1 && mNum <= 12) ? mNum - 1 : 8;
            mName = monthNames[mIdx];
        }
        const mNumStr = String(mIdx + 1);
        const mNumPad = mNumStr.padStart(2, '0');

        // 1. Fetch Orders for Month & Year
        let orderFilter = {};
        if (req.query.storeId && req.query.storeId !== 'all') {
            orderFilter.storeId = req.query.storeId;
        }

        const allOrders = await Order.find(orderFilter).lean();
        const monthOrders = allOrders.filter(o => {
            const ts = String(o.timestamp || o.date || o.createdAt || o.order_date || '');
            const match1 = ts.match(new RegExp(`^(?:\\d{1,2})/(?:${mNumStr}|${mNumPad})/${year}`));
            const match2 = ts.match(new RegExp(`^${year}-(?:${mNumStr}|${mNumPad})`));
            return match1 || match2;
        });

        let grossRevenue = 0;
        let totalDiscounts = 0;
        let netRevenue = 0;
        let cashCollected = 0;
        let onlineCollected = 0;
        let pendingCollection = 0;
        let deliveredCount = 0;
        let pendingCount = 0;
        let deliveryFeesCollected = 0;

        const serviceBreakdown = {};
        const dailyBreakdown = {};

        monthOrders.forEach(o => {
            const finalAmt = Number(o.received_amount !== undefined && o.received_amount !== null && o.received_amount > 0 ? o.received_amount : (o.final_amount || o.finalAmount || o.totalAmount || o.total || o.amount || 0));
            const totalAmt = Number(o.total || o.totalAmount || o.amount || finalAmt);
            const discAmt = Number(o.discount || 0);
            const dFee = Number(o.deliveryFee || 0);

            grossRevenue += totalAmt;
            totalDiscounts += discAmt;
            netRevenue += finalAmt;
            deliveryFeesCollected += dFee;

            const mode = String(o.paymentMode || o.payment_mode || o.paymentMethod || '').toLowerCase();
            const status = String(o.paymentStatus || o.payment_status || '').toLowerCase();

            if (status === 'received' || status === 'paid' || mode.includes('cash') || mode.includes('online') || mode.includes('qr') || mode.includes('upi')) {
                if (mode.includes('cash')) {
                    cashCollected += finalAmt;
                } else {
                    onlineCollected += finalAmt;
                }
            } else {
                pendingCollection += finalAmt;
            }

            if (String(o.status || '').toLowerCase() === 'delivered') {
                deliveredCount++;
            } else {
                pendingCount++;
            }

            // Service Breakdown
            const sType = String(o.serviceType || o.service_type || o.service || 'Laundry Service').trim();
            if (!serviceBreakdown[sType]) serviceBreakdown[sType] = { count: 0, revenue: 0 };
            serviceBreakdown[sType].count++;
            serviceBreakdown[sType].revenue += finalAmt;

            // Daily Breakdown
            const ts = String(o.timestamp || o.date || '');
            const dayMatch = ts.match(/^(\d{1,2})/);
            const dayKey = dayMatch ? `${dayMatch[1]} ${mName}` : 'Other';
            if (!dailyBreakdown[dayKey]) dailyBreakdown[dayKey] = { orders: 0, revenue: 0 };
            dailyBreakdown[dayKey].orders++;
            dailyBreakdown[dayKey].revenue += finalAmt;
        });

        // 2. Fetch Expenses for Month & Year
        const expFilter = {
            year,
            $or: [
                { month: mName },
                { month: mNumStr },
                { month: mNumPad }
            ]
        };
        if (req.query.storeId && req.query.storeId !== 'all') expFilter.storeId = req.query.storeId;

        const expenses = await Expense.find(expFilter).lean();

        let totalOpex = 0;
        let totalCapex = 0;
        let totalFunding = 0;
        const opexBreakdown = {};
        const capexBreakdown = {};
        const fundingEntries = [];

        expenses.forEach(e => {
            const amt = Number(e.amount || 0);
            if (e.type === 'funding') {
                totalFunding += amt;
                fundingEntries.push(e);
            } else if (e.type === 'capex') {
                totalCapex += amt;
                const sub = e.subtype || 'other asset';
                capexBreakdown[sub] = (capexBreakdown[sub] || 0) + amt;
            } else {
                totalOpex += amt;
                const sub = e.subtype || 'office expense';
                opexBreakdown[sub] = (opexBreakdown[sub] || 0) + amt;
            }
        });

        const totalCollected = cashCollected + onlineCollected;
        const operatingProfitLoss = netRevenue - totalOpex;
        const netCashFlow = (totalCollected + totalFunding) - (totalOpex + totalCapex);
        const aov = monthOrders.length > 0 ? Math.round(netRevenue / monthOrders.length) : 217;
        const breakEvenOrders = aov > 0 ? Math.ceil(totalOpex / aov) : 0;

        res.json({
            period: { month: mName, year, monthNumber: mIdx + 1 },
            revenue: {
                totalOrders: monthOrders.length,
                grossRevenue,
                totalDiscounts,
                netRevenue,
                cashCollected,
                onlineCollected,
                totalCollected,
                pendingCollection,
                deliveredCount,
                pendingCount,
                deliveryFeesCollected,
                serviceBreakdown,
                dailyBreakdown
            },
            expenses: {
                totalOpex,
                totalCapex,
                totalExpenses: totalOpex + totalCapex,
                opexBreakdown,
                capexBreakdown,
                items: expenses
            },
            funding: {
                totalFunding,
                entries: fundingEntries
            },
            pnl: {
                netRevenue,
                operatingExpenses: totalOpex,
                operatingProfitLoss,
                capitalExpenditure: totalCapex,
                netCashFlow,
                averageOrderValue: aov,
                breakEvenOrders,
                currentRunRate: monthOrders.length,
                gapToBreakEven: Math.max(0, breakEvenOrders - monthOrders.length)
            }
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

        const token = jwt.sign({ id: rider.id, name: rider.name, role: 'rider' }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, role: 'rider', rider: { id: rider.id, name: rider.name, username: rider.username, profilePicture: rider.profilePicture, storeId: rider.storeId } });
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
    let xlsx;
    try { xlsx = require('xlsx'); } catch(e) {}
    if (!xlsx) {
        return res.status(500).json({ error: 'Legacy xlsx library is not installed.' });
    }
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

// PUBLIC: Fetch Approved Stores (For Web & App)
app.get('/api/public/stores', async (req, res) => {
    try {
        const stores = await Store.find({ approved: true });
        const normalized = stores.map(s => {
            const obj = s.toObject();
            if (!obj.address && obj.location) obj.address = obj.location;
            if (!obj.location && obj.address) obj.location = obj.address;
            return obj;
        });
        res.json(normalized);
    } catch (err) {
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

app.get('/api/manager/store-settings', verifyToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.status(403).json({ error: 'Manager only' });
    try {
        const store = await Store.findOne({ id: req.user.id });
        if (!store) return res.status(404).json({ error: 'Store not found' });
        res.json(store);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/manager/store-settings', verifyToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.status(403).json({ error: 'Manager only' });
    try {
        const { googleAnalyticsId } = req.body;
        const store = await Store.findOne({ id: req.user.id });
        if (!store) return res.status(404).json({ error: 'Store not found' });

        store.googleAnalyticsId = googleAnalyticsId || '';
        await store.save();

        req.io.emit('stores_updated', store);
        syncToFirestore('stores', store.id, store.toObject());

        res.json({ status: 'success', store });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

app.put('/api/inventory/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const { item, quantity, unit, storeId } = req.body;
        const inventory = await Inventory.findById(req.params.id);
        if (!inventory) return res.status(404).json({ error: 'Inventory item not found' });

        const oldItem = inventory.item;
        const oldStoreId = inventory.storeId;

        inventory.item = item || inventory.item;
        inventory.quantity = parseFloat(quantity) !== undefined ? parseFloat(quantity) : inventory.quantity;
        inventory.unit = unit || inventory.unit;
        inventory.storeId = storeId || inventory.storeId;
        inventory.lastUpdated = new Date().toLocaleString();

        await inventory.save();

        req.io.emit('inventory_updated', inventory);

        if (oldItem !== inventory.item || oldStoreId !== inventory.storeId) {
            await deleteFromFirestore('inventory', `${oldStoreId}_${oldItem}`);
        }
        syncToFirestore('inventory', `${inventory.storeId}_${inventory.item}`, inventory.toObject());

        res.json(inventory);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventory/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const inventory = await Inventory.findById(req.params.id);
        if (!inventory) return res.status(404).json({ error: 'Inventory item not found' });

        await Inventory.deleteOne({ _id: req.params.id });

        req.io.emit('inventory_updated', { deletedId: req.params.id });
        await deleteFromFirestore('inventory', `${inventory.storeId}_${inventory.item}`);

        res.json({ message: "Inventory item deleted" });
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

// NEWSLETTER SUBSCRIBE (Public)
app.post('/api/public/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
        const cleanEmail = email.toLowerCase().trim();
        const existing = await Subscriber.findOne({ email: cleanEmail });
        if (existing) {
            if (existing.active) {
                return res.json({ message: 'You\'re already subscribed! 🎉' });
            }
            existing.active = true;
            existing.subscribedAt = new Date();
            await existing.save();
            sendWelcomeEmail(cleanEmail).catch(err => {
                console.error("Welcome email background send failed:", err.message);
            });
            return res.json({ message: 'Welcome back! Subscription reactivated 🎉' });
        }
        await Subscriber.create({ email: cleanEmail });
        sendWelcomeEmail(cleanEmail).catch(err => {
            console.error("Welcome email background send failed:", err.message);
        });
        res.json({ message: 'Successfully subscribed! 🎉' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

// Admin: List all subscribers
app.get('/api/subscribers', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        const subscribers = await Subscriber.find({ active: true }).sort({ subscribedAt: -1 });
        res.json(subscribers);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// EXPORT & LOGS
const ExcelJS = require('exceljs');

app.get('/api/export/excel', verifyToken, async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'manager') {
            filter.storeId = req.user.id;
        } else if (req.user.role === 'admin' && req.query.storeId && req.query.storeId !== 'all') {
            filter.storeId = req.query.storeId;
        }

        // Apply date filter unless allTime=true is requested
        if (req.query.allTime !== 'true' && req.query.date) {
            const [year, month, day] = req.query.date.split('-');
            const dayInt = parseInt(day, 10);
            const monthInt = parseInt(month, 10);
            filter.timestamp = { $regex: `^0?${dayInt}/0?${monthInt}/${year}` };
        }

        const orders = await Order.find(filter).sort({ timestamp: -1 }).lean();
        const finalOrders = await attachRepeatCustomerFlag(orders);
        
        const stores = await Store.find().lean();
        const storeMap = {};
        stores.forEach(s => {
            storeMap[s.id] = s.name;
        });
        
        // 1. Map orders detailed log data
        const data = finalOrders.map(order => {
            const servicesList = Array.isArray(order.services) ? order.services : (order.services ? String(order.services).split(',') : []);
            let computedSubtotal = 0;
            servicesList.forEach(s => {
                const parsed = parseService(s);
                computedSubtotal += parsed.price || 0;
            });
            
            const netAmount = Number(order.total) || 0;
            const discountPct = Number(order.discount) || 0;
            
            let grossAmount = computedSubtotal;
            if (grossAmount <= 0) {
                if (discountPct > 0 && discountPct < 100) {
                    grossAmount = netAmount / (1 - discountPct / 100);
                } else {
                    grossAmount = netAmount;
                }
            }
            
            grossAmount = Math.round(grossAmount);
            const discountAmount = Math.max(0, grossAmount - netAmount);
            const cleanServicesStr = servicesList.map(s => {
                const parsed = parseService(s);
                return `${parsed.name} (${parsed.qty} pcs)`;
            }).join(', ');

            const seg = order.sourceSegment || (order.source === 'WhatsApp' ? 'SM' : order.source === 'App' ? 'AP' : order.source === 'Walk-in' ? 'RF' : order.source === 'Web' ? 'WS' : 'RF');
            const segMap = {
                'NP': 'NewsPaper (NP)',
                'SM': 'Social / WhatsApp (SM)',
                'RF': 'Walk-in / Ref (RF)',
                'WS': 'Website (WS)',
                'AP': 'Customer App (AP)'
            };

            return {
                'Order ID': order.id,
                'Store ID': order.storeId || 'GLOBAL',
                'Store Name': storeMap[order.storeId] || 'Global / N/A',
                'Date': order.timestamp,
                'Customer Name': order.name,
                'Phone': order.phone,
                'Address': order.address || 'Walk-in',
                'Source': order.source || 'Walk-in',
                'Marketing Source': segMap[seg] || seg,
                'Account Type': order.cx_type || 'Residential',
                'Customer Status': order.isRepeatCustomer ? 'Repeat Customer' : 'New Customer',
                'Services': cleanServicesStr,
                'Status': order.status,
                'Gross Amount (₹)': grossAmount,
                'Discount (%)': discountPct,
                'Discount Amount (₹)': discountAmount,
                'Payable Amount (₹)': netAmount
            };
        });

        // 2. Generate Store Analytics Sheet
        const storeAnalytics = Object.keys(storeMap).map(storeId => {
            const storeOrders = finalOrders.filter(o => o.storeId === storeId);
            const totalOrdersCount = storeOrders.length;
            
            let totalGross = 0;
            let totalPayable = 0;
            
            storeOrders.forEach(o => {
                const netAmount = Number(o.total) || 0;
                const discountPct = Number(o.discount) || 0;
                
                let computedSubtotal = 0;
                const sList = Array.isArray(o.services) ? o.services : (o.services ? String(o.services).split(',') : []);
                sList.forEach(s => {
                    computedSubtotal += parseService(s).price || 0;
                });
                
                let grossAmount = computedSubtotal;
                if (grossAmount <= 0) {
                    if (discountPct > 0 && discountPct < 100) {
                        grossAmount = netAmount / (1 - discountPct / 100);
                    } else {
                        grossAmount = netAmount;
                    }
                }
                totalGross += grossAmount;
                totalPayable += netAmount;
            });
            
            return {
                'Store ID': storeId,
                'Store Name': storeMap[storeId],
                'Total Orders': totalOrdersCount,
                'Total Gross (₹)': Math.round(totalGross),
                'Total Discount (₹)': Math.round(totalGross - totalPayable),
                'Total Payable (₹)': Math.round(totalPayable)
            };
        }).filter(row => row['Total Orders'] > 0);

        // 3. Generate Service Analytics Sheet
        const serviceMapStats = {};
        finalOrders.forEach(o => {
            const sList = Array.isArray(o.services) ? o.services : (o.services ? String(o.services).split(',') : []);
            const cleanServices = sList.map(s => parseService(s)).filter(s => s.name);
            if (cleanServices.length === 0) return;
            
            const netAmount = Number(o.total) || 0;
            const share = netAmount / cleanServices.length;
            
            cleanServices.forEach(s => {
                const key = s.serviceType;
                if (!serviceMapStats[key]) {
                    serviceMapStats[key] = { count: 0, qty: 0, revenue: 0 };
                }
                serviceMapStats[key].count += 1;
                serviceMapStats[key].qty += s.qty || 1;
                serviceMapStats[key].revenue += share;
            });
        });
        
        const serviceAnalytics = Object.keys(serviceMapStats).map(name => ({
            'Service Name': name,
            'Total Orders': serviceMapStats[name].count,
            'Total Pcs Quantity': serviceMapStats[name].qty,
            'Proportional Revenue (₹)': Math.round(serviceMapStats[name].revenue)
        })).sort((a, b) => b['Total Orders'] - a['Total Orders']);

        // 4. Generate Acquisition Source Analytics Sheet
        const sourceMapStats = {
            'NP': { name: 'NewsPaper pamphlet (NP)', count: 0, revenue: 0 },
            'SM': { name: 'Social Media / WhatsApp (SM)', count: 0, revenue: 0 },
            'RF': { name: 'Reference / Walk-in (RF)', count: 0, revenue: 0 },
            'WS': { name: 'Website Direct (WS)', count: 0, revenue: 0 },
            'AP': { name: 'Customer Mobile App (AP)', count: 0, revenue: 0 }
        };

        let totalRev = 0;
        finalOrders.forEach(o => {
            const seg = o.sourceSegment || (o.source === 'WhatsApp' ? 'SM' : o.source === 'App' ? 'AP' : o.source === 'Walk-in' ? 'RF' : o.source === 'Web' ? 'WS' : 'RF');
            const target = sourceMapStats[seg] || sourceMapStats['RF'];
            const net = Number(o.total) || 0;
            target.count += 1;
            target.revenue += net;
            totalRev += net;
        });

        const totalOrdersCount = finalOrders.length || 1;
        const sourceAnalytics = Object.keys(sourceMapStats).map(code => {
            const item = sourceMapStats[code];
            const orderShare = Math.round((item.count / totalOrdersCount) * 100);
            const revShare = totalRev > 0 ? Math.round((item.revenue / totalRev) * 100) : 0;
            return {
                'Source Code': code,
                'Acquisition Channel': item.name,
                'Total Orders': item.count,
                'Order Share (%)': `${orderShare}%`,
                'Total Revenue (₹)': Math.round(item.revenue),
                'Revenue Share (%)': `${revShare}%`
            };
        }).sort((a, b) => b['Total Orders'] - a['Total Orders']);

        // Write Sheets to Workbook using ExcelJS
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Laundry Basket';
        workbook.created = new Date();

        const addJsonSheet = (sheetName, rows) => {
            if (!rows || rows.length === 0) return;
            const sheet = workbook.addWorksheet(sheetName);
            const headers = Object.keys(rows[0]);
            sheet.columns = headers.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...rows.map(r => String(r[key] ?? '').length)
                );
                return { header: key, key: key, width: Math.max(12, maxLen + 3) };
            });
            sheet.addRows(rows);
            const headerRow = sheet.getRow(1);
            headerRow.font = { bold: true };
        };

        addJsonSheet('Orders Log', data);
        if (sourceAnalytics.length > 0) {
            addJsonSheet('Source Analytics', sourceAnalytics);
        }
        if (storeAnalytics.length > 0) {
            addJsonSheet('Store Analytics', storeAnalytics);
        }
        if (serviceAnalytics.length > 0) {
            addJsonSheet('Service Analytics', serviceAnalytics);
        }

        const buffer = await workbook.xlsx.writeBuffer();

        const filename = req.query.allTime === 'true' 
            ? 'Total_Business_Report.xlsx' 
            : `Orders_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({ error: 'Failed to generate Excel file' });
    }
});

// AUTHENTICATED PUSH CAMPAIGN ENDPOINTS
app.post('/api/notifications/send', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { targetType, targetId, title, body } = req.body;

    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
    }

    try {
        let tokens = [];

        if (targetType === 'all_customers') {
            const customers = await Customer.find({ fcmToken: { $ne: null } }).select('fcmToken').lean();
            tokens = customers.map(c => c.fcmToken);
        } else if (targetType === 'all_riders') {
            let filter = { fcmToken: { $ne: null } };
            // If branch manager sends, they might only want to target riders in their own branch
            if (req.user.role === 'manager') {
                filter.storeId = req.user.id;
            }
            const riders = await Rider.find(filter).select('fcmToken').lean();
            tokens = riders.map(r => r.fcmToken);
        } else if (targetType === 'specific_customer') {
            if (!targetId) return res.status(400).json({ error: 'Target Customer ID/Phone/Email required' });
            
            // Try matching phone, email, or name
            const cleanPhone = targetId.replace(/\D/g, '').slice(-10);
            const customer = await Customer.findOne({ 
                $or: [
                    { phone: cleanPhone.length === 10 ? cleanPhone : 'INVALID' }, 
                    { email: targetId }, 
                    { name: targetId }
                ] 
            }).select('fcmToken').lean();
            if (customer && customer.fcmToken) tokens.push(customer.fcmToken);
        } else if (targetType === 'specific_rider') {
            if (!targetId) return res.status(400).json({ error: 'Target Rider ID required' });
            const rider = await Rider.findOne({ id: targetId }).select('fcmToken').lean();
            if (rider && rider.fcmToken) tokens.push(rider.fcmToken);
        }

        if (tokens.length === 0) {
            return res.status(400).json({ error: 'No recipients found with valid FCM tokens' });
        }

        let sentCount = 0;
        for (const token of tokens) {
            try {
                await sendNotification({
                    token,
                    title,
                    body,
                    data: { type: 'custom_alert' }
                });
                sentCount++;
            } catch (err) {
                console.error("FCM Send Error during campaign:", err.message);
            }
        }

        // Save campaign log
        const campaign = new Campaign({
            title,
            body,
            targetType,
            targetId: targetId || 'All',
            sentCount,
            totalCount: tokens.length
        });
        await campaign.save();

        res.json({ status: 'success', sentCount, totalCount: tokens.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/campaigns', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const campaigns = await Campaign.find().sort({ _id: -1 }).limit(100).lean();
        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ error: err.message });
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
