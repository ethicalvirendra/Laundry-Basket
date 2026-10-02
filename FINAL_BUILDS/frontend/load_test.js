const axios = require('axios');

const API_URL = 'http://localhost:5000/api/orders';
const NUM_REQUESTS = 100;
const CONCURRENCY = 10;

async function runTest() {
    console.log(`🚀 Starting Stress Test: ${NUM_REQUESTS} orders with concurrency of ${CONCURRENCY}...`);
    const startTime = Date.now();
    
    let success = 0;
    let failure = 0;
    let latencies = [];

    const sendRequest = async () => {
        const reqStart = Date.now();
        try {
            await axios.post(API_URL, {
                customerName: "Stress Test User",
                phone: "0000000000",
                address: "Stress Test Address",
                items: [{ name: "Load Test Shirt", price: 99, quantity: 1 }],
                total: 99,
                storeId: "TEST_LOAD"
            });
            success++;
            latencies.push(Date.now() - reqStart);
        } catch (e) {
            failure++;
            // console.error(e.message);
        }
    };

    // Run in batches to simulate concurrent users
    for (let i = 0; i < NUM_REQUESTS; i += CONCURRENCY) {
        const batch = [];
        for (let j = 0; j < CONCURRENCY && i + j < NUM_REQUESTS; j++) {
            batch.push(sendRequest());
        }
        await Promise.all(batch);
        process.stdout.write("."); // Progress indicator
    }

    const duration = (Date.now() - startTime) / 1000;
    const avgLatency = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0;

    console.log(`\n\n✅ Stress Test Finished!`);
    console.log(`-------------------------`);
    console.log(`Success:    ${success}`);
    console.log(`Failure:    ${failure}`);
    console.log(`Total Time: ${duration}s`);
    console.log(`Avg Latency: ${avgLatency}ms`);
    console.log(`Throughput: ${(NUM_REQUESTS / duration).toFixed(2)} req/s`);
    console.log(`-------------------------`);
}

runTest();
