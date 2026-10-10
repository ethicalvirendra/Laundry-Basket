const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/laundry_basket";

// Helper to safely parse numbers and avoid NaN validation errors
const parseNum = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    // Strip out currency symbols or spaces if present
    const clean = String(val).replace(/[^\d.-]/g, '');
    const parsed = Number(clean);
    return isNaN(parsed) ? 0 : parsed;
};

const normalizeText = (value) => String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\+/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const compactText = (value) => normalizeText(value).replace(/\s+/g, '');

const normalizeImportedItemName = (value) => {
    const normalized = normalizeText(value);
    if (normalized === 'duet' || normalized === 'duvet') return 'duvet cover';
    if (normalized === 'bedsheet' || normalized === 'bed sheet') return 'bed sheet';
    if (normalized === 'cover') return 'pillow cover';
    if (normalized === 'pillow') return 'pillow cover';
    return normalized;
};

const parseImportedItems = (itemsText) => String(itemsText || '')
    .split(/\r?\n|,/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
        const match = line.match(/^(.+?)[\s-]+(\d+)\s*(?:pcs?)?$/i);
        return {
            rawName: match ? match[1].trim() : line,
            qty: match ? parseInt(match[2], 10) || 1 : 1
        };
    });

const estimateTotalFromRates = (rates, itemsText, serviceType) => {
    const importedItems = parseImportedItems(itemsText);
    const serviceNeedle = compactText(serviceType || 'Wash & Iron');
    return importedItems.reduce((sum, item) => {
        const itemNeedle = normalizeImportedItemName(item.rawName);
        const compatibleRates = rates.filter(rate => {
            const rateService = compactText(rate.serviceType || '');
            return !serviceNeedle || rateService === serviceNeedle || rateService.includes(serviceNeedle) || serviceNeedle.includes(rateService);
        });
        const pool = compatibleRates.length > 0 ? compatibleRates : rates;
        const match = pool.find(rate => normalizeText(rate.item || '') === itemNeedle)
            || pool.find(rate => normalizeText(rate.item || '').includes(itemNeedle))
            || pool.find(rate => itemNeedle.includes(normalizeText(rate.item || '')));
        return sum + ((parseNum(match?.price) || 0) * item.qty);
    }, 0);
};

const parseDate = (val) => {
    if (val === undefined || val === null || val === '' || val === '-' || String(val).trim() === '-') return null;
    
    // If already a JS Date object
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? null : val;
    }
    
    // If it is a number (Excel serial date number or string representing it)
    const num = Number(val);
    if (!isNaN(num) && num > 30000 && num < 60000) {
        // Excel serial date range (30000 is ~1982, 60000 is ~2064)
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        return isNaN(date.getTime()) ? null : date;
    }
    
    // If it is a string representing a month only or a word, return null
    if (typeof val === 'string' && isNaN(Date.parse(val)) && !/^\d+/.test(val.trim())) {
        return null;
    }
    
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        return d;
    }

    // Try parsing dd-mm-yyyy or dd/mm/yyyy string manually if JS Date fails
    const str = String(val).trim();
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
        let day, month, year;
        if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        } else if (parts[2].length === 4) {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
        }
        if (year && !isNaN(month) && day) {
            const parsed = new Date(year, month, day);
            if (!isNaN(parsed.getTime())) return parsed;
        }
    }
    
    return null;
};

// Connecting to DB
mongoose.connect(MONGO_URI)
  .then(() => {
      console.log('✅ Connected to DB for multi-sheet Excel migration');
  })
  .catch(err => {
      console.error('❌ DB Connection Error:', err);
      process.exit(1);
  });

// Schema matching your Power BI / Dashboard guidelines
const OrderSchema = new mongoose.Schema({
    id: { type: String, unique: true }, 
    storeId: String,
    name: String,
    phone: String,
    address: { type: String, default: 'Home Delivery' },
    services: [String],
    total: Number,
    commission: Number,
    netEarning: Number,
    status: { type: String, default: 'Pending' },
    paymentStatus: { type: String, default: 'Pending' }, 
    paymentMode: { type: String, default: null }, 
    source: { type: String, default: 'Web' }, 
    timestamp: { type: String, default: () => new Date().toLocaleString() },
    events: [{ status: String, time: { type: String, default: () => new Date().toLocaleTimeString() } }],
    assignedRiderId: { type: String, default: null },
    
    // Power BI Underscore Fields
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
    cx_type: String   // Smart auto-categorized: Business / Regular / Premium / Walk-in / App
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

const StoreSchema = new mongoose.Schema({
    id: String,
    name: String,
    branchCode: String,
    manager: String,
    password: { type: String },
});
const Store = mongoose.models.Store || mongoose.model('Store', StoreSchema);

const RateSchema = new mongoose.Schema({
    item: String,
    category: String,
    serviceType: String,
    price: Number
});
const Rate = mongoose.models.Rate || mongoose.model('Rate', RateSchema);

// OrderTracker using your exact business logic
class OrderTracker {
    constructor(data) {
        // Customer Details
        this.customer = {
            id: data.IDCUSTTOMER,
            name: data.NAME,
            mobile: data.MOBILENUMBER
        };

        // Order Details
        this.order = {
            date: parseDate(data.DATEORDER) || new Date(),
            items: data.ITEMS,
            quantity: parseNum(data.QUANTITY),
            service: data.SERVICE
        };

        // Logistics & Fulfillment
        this.delivery = {
            status: data.DELIVERYSTATUS,
            date: parseDate(data.DELIVERYDATE),
            mode: data.Mode2,
            pickupPerson: data.PICKUPPERSON,
            deliveredPerson: data.DELIVEREDPERSON
        };

        // Financials
        this.financials = {
            paymentStatus: data.PAYMENTSTATUS,
            paymentMode: data.PAYEMENTMODE,
            receivedAmount: parseNum(data.RECEIVEDPAYEMNT),
            pendingAmount: parseNum(data.PENDINGAMOUNT),
            receivedDate: parseDate(data.RECEIVEDDATE),
            receivedMonth: data.RECEIVEDMONTH
        };
    }

    get totalDaysSinceOrdered() {
        const today = new Date();
        const diffTime = Math.abs(today - this.order.date);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 0;
    }

    get pendingPaymentDays() {
        const pStatus = String(this.financials.paymentStatus || '').toLowerCase();
        if (this.financials.pendingAmount <= 0 || pStatus.includes('paid') || pStatus.includes('received')) {
            return 0;
        }
        return this.totalDaysSinceOrdered;
    }

    getAnalysisSummary() {
        return {
            customerName: this.customer.name,
            totalDaysOpen: this.totalDaysSinceOrdered,
            paymentRisk: this.financials.pendingAmount > 0 ? 'HIGH RISK' : 'CLEAR',
            daysPaymentOverdue: this.pendingPaymentDays,
            deliveryStatus: this.delivery.status
        };
    }
}

function getCxType({ sheetSource }) {
    if (sheetSource === 'Business') return 'Business';
    return 'Residential';
}

async function importExcel(filePath, shouldPurge, sheetSource = 'Regular') {

    try {
        if (shouldPurge) {
            console.log('🧹 Purging all existing order history from MongoDB...');
            const deleteResult = await Order.deleteMany({});
            console.log(`✅ Cleared ${deleteResult.deletedCount} orders.`);
        } else {
            console.log('📥 Appending new sheet orders to existing database (no purge)...');
        }
        
        console.log(`📥 Loading Excel: ${filePath}...`);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Excel file not found: ${filePath}`);
            return;
        }

        const workbook = xlsx.readFile(filePath, { cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`📊 Parsing ${data.length} rows with exact Power BI header keys...`);

        // Fetch stores to map storeId dynamically
        const stores = await Store.find({});
        
        // Find "Ayodhya Nagar" to set as fallback branch
        const ayodhyaStore = stores.find(s => s.name && (s.name.toLowerCase().includes('ayodhya') || s.name.toLowerCase().includes('main')));
        const fallbackStoreId = ayodhyaStore ? ayodhyaStore.id : (stores[0] ? stores[0].id : 'LBBPL');
        console.log(`📍 Main Branch Fallback: "${ayodhyaStore ? ayodhyaStore.name : 'Default'}" (ID: ${fallbackStoreId})`);

        const rates = await Rate.find({}).lean();
        let successCount = 0;

        for (const row of data) {
            const keys = Object.keys(row);
            
            // Exact matching for column variants
            const getVal = (possibleKeys) => {
                const foundKey = keys.find(k => possibleKeys.includes(k.trim().toUpperCase()));
                return foundKey ? row[foundKey] : undefined;
            };

            const rawData = {
                DATEORDER: getVal(['DATE', 'DATEORDER']),
                IDCUSTTOMER: getVal(['ORDER ID', 'ORDERID', 'IDCUSTTOMER']),
                NAME: getVal(['CX NAM', 'CUSTTOMER NAME', 'CUSTOMER NAME', 'NAME']),
                MOBILENUMBER: getVal(['MOBILE NUMBER', 'MOBILENUMBER', 'PHONE']),
                ITEMS: getVal(['ITEMES', 'ITEMS']),
                QUANTITY: getVal(['QTY.', 'QTY', 'QUANTITY']),
                SERVICE: getVal(['SERVICE']),
                PAYMENTSTATUS: getVal(['PAYMENT STATUS', 'PAYMENTSTATUS']),
                PENDINGAMOUNT: getVal(['PENDING AMOUNT', 'PENDINGAMOUNT']),
                RECEIVEDPAYEMNT: getVal(['RECIVED PAYEMNT', 'RECEIVEDPAYEMNT', 'RECEIVED PAYMENT']),
                RECEIVEDDATE: getVal(['PAYMENT DATE', 'RECEIVED DATE', 'RECEIVEDDATE']),
                RECEIVEDMONTH: getVal(['MONTH', 'RECEIVED MONTH', 'RECEIVEDMONTH']),
                PAYEMENTMODE: getVal(['PAYEMENT MODE', 'PAYEMENTMODE', 'PAYMENT MODE']),
                DELIVERYSTATUS: getVal(['DELIVERY STATUS', 'DELIVERYSTATUS']),
                DELIVERYDATE: getVal(['DELIVERED DATE', 'DELIVERY DATE', 'DELIVERYDATE']),
                Mode2: getVal(['MODE 2', 'MODE2']),
                PICKUPPERSON: getVal(['PICKUP PERSON', 'PICKUPPERSON']),
                DELIVEREDPERSON: getVal(['DELIVERED PERSON', 'DELIVEREDPERSON'])
            };

            // Process via class
            const tracker = new OrderTracker(rawData);
            const summary = tracker.getAnalysisSummary();

            // Extract customer
            const id = tracker.customer.id ? String(tracker.customer.id).trim() : `IMP_${Math.random().toString(36).substring(7).toUpperCase()}`;
            const cleanPhone = String(tracker.customer.mobile || '').replace(/\D/g, '').slice(-10) || '0000000000';
            const name = tracker.customer.name || 'Customer';

            // Services
            const sName = tracker.order.service || 'Laundry';
            const itemName = tracker.order.items || '';
            const qty = tracker.order.quantity || 0;
            let serviceString = sName;
            if (itemName) {
                serviceString += ` - ${itemName}`;
                if (qty) serviceString += ` (${qty} pcs)`;
            }
            const services = [serviceString];

            // Financial pricing checks
            const receivedAmount = tracker.financials.receivedAmount;
            const pendingAmount = tracker.financials.pendingAmount;
            const importedTotal = receivedAmount + pendingAmount;
            const estimatedTotal = importedTotal > 0 ? 0 : estimateTotalFromRates(rates, tracker.order.items, sName);
            const total = importedTotal > 0 ? importedTotal : estimatedTotal;

            const commission = Math.round(total * 0.05); // 5% Commission
            const netEarning = total - commission;

            // Map delivery and payment status for backwards compatibility
            // Forced strictly to 'Delivered' to mark all orders as delivered as requested
            let status = 'Delivered';

            const rawPayStatus = String(tracker.financials.paymentStatus || '').toLowerCase();
            let paymentStatus = 'Pending';
            if (rawPayStatus.includes('paid') || rawPayStatus.includes('received') || rawPayStatus.includes('complete') || rawPayStatus === 'ok' || pendingAmount <= 0) {
                paymentStatus = 'Received';
            }

            const paymentMode = tracker.financials.paymentMode || 'Cash';
            const timestamp = tracker.order.date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

            // Store ID assignment - Forced strictly to Ayodhya Nagar as requested
            let storeId = fallbackStoreId;

            // Events timeline
            const events = [];
            events.push({ status: 'Pending', time: timestamp });
            if (tracker.delivery.pickupPerson) {
                events.push({ status: `Picked up by ${tracker.delivery.pickupPerson}`, time: timestamp });
            }
            if (tracker.delivery.deliveredPerson) {
                events.push({ 
                    status: `Delivered by ${tracker.delivery.deliveredPerson}`, 
                    time: tracker.delivery.date ? tracker.delivery.date.toLocaleString() : timestamp 
                });
            }

            // Save/Upsert directly to MongoDB
            await Order.findOneAndUpdate(
                { id: id },
                {
                    storeId,
                    name,
                    phone: cleanPhone,
                    address: 'Home Delivery',
                    services,
                    total,
                    commission,
                    netEarning,
                    status,
                    paymentStatus,
                    paymentMode,
                    source: 'Import',
                    timestamp,
                    events,
                    
                    // Core underscore-cased dashboard keys (Strictly mapped to your specs!)
                    customer_id: id,
                    customer_name: name,
                    mobile_number: cleanPhone,
                    order_date: tracker.order.date ? tracker.order.date.toISOString().split('T')[0] : null,
                    items_ordered: tracker.order.items,
                    quantity: qty,
                    service_type: sName,
                    pickup_person: tracker.delivery.pickupPerson,
                    delivery_person: tracker.delivery.deliveredPerson,
                    delivery_status: 'Delivered',
                    delivery_date: tracker.delivery.date ? tracker.delivery.date.toISOString().split('T')[0] : null,
                    delivery_mode: tracker.delivery.mode,
                    payment_status: tracker.financials.paymentStatus,
                    payment_mode: tracker.financials.paymentMode,
                    received_amount: receivedAmount,
                    pending_amount: pendingAmount,
                    received_date: tracker.financials.receivedDate ? tracker.financials.receivedDate.toISOString().split('T')[0] : null,
                    received_month: tracker.financials.receivedMonth || (tracker.financials.receivedDate ? tracker.financials.receivedDate.toLocaleString('en-US', { month: 'long' }) : null),
                    total_days_aging: summary.totalDaysOpen,
                    pending_payment_days: summary.daysPaymentOverdue,
                    payment_risk: summary.paymentRisk,
                    cx_type: getCxType({
                        sheetSource,
                        serviceType: sName,
                        quantity: qty,
                        totalAmount: total,
                        deliveryMode: tracker.delivery.mode
                    })
                },
                { upsert: true, returnDocument: 'after' } // Upgraded "new" option to standard returnDocument
            );
            successCount++;
        }

        console.log(`🎉 Sheet import complete: ${successCount} processed successfully!`);

    } catch (err) {
        console.error('❌ Error during smart parsing Excel import:', err);
    }
}

async function run() {
    // 1. Purges DB and imports primary ORDER LIST (1).xlsx (Residential)
    await importExcel("C:/Users/viren/Downloads/ORDER LIST (1).xlsx", true, 'Residential');
    
    // 2. Appends Untitled spreadsheet.xlsx (Business) — tagged as 'Business'
    await importExcel("C:/Users/viren/Downloads/Untitled spreadsheet.xlsx", false, 'Business');

    
    console.log("All migrations complete successfully!");
    process.exit(0);
}

run();
