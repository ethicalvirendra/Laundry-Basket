const axios = require('axios');

async function createTestOrder() {
    try {
        const order = {
            id: 'TEST-1234',
            storeId: 'LBBPL',
            name: 'Test Customer',
            phone: '1234567890',
            address: '123 Test Street',
            services: ['Wash & Iron (2)', 'Dry Clean (1)'],
            total: 550,
            status: 'Processing',
            source: 'Web Test'
        };

        const res = await axios.post('http://localhost:5000/api/orders', order);
        console.log("✅ Order Created:", res.data);
    } catch (err) {
        console.error("❌ Order Creation Failed:", err.response?.data || err.message);
    }
}

createTestOrder();
