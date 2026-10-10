const request = require('supertest');
const mongoose = require('mongoose');

// Because server.js binds to a port and starts the server immediately,
// requiring it might cause issues or start the actual server on test runs.
// Ideally, server.js exports the app without starting if not in production.
// For the sake of this API Tester script, we'll assume `app` is exportable or we test live.
// We will test against the live instance on localhost:5000 if it's running.

const API_URL = 'http://localhost:5000';

describe('Laundry Basket API Tests', () => {
    
    // Generate a unique dummy order ID
    const dummyOrderId = 'TEST-ORDER-' + Date.now();
    let storeId = 'STORE101'; // Default store ID in our system

    describe('Reviews API', () => {
        it('should submit a review successfully', async () => {
            const res = await request(API_URL)
                .post('/api/reviews')
                .send({
                    orderId: dummyOrderId,
                    customerId: 'CUST-1',
                    storeId: storeId,
                    riderRating: 5,
                    serviceRating: 4,
                    feedback: 'Excellent service, quick delivery!'
                });
            
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('_id');
            expect(res.body.orderId).toEqual(dummyOrderId);
        });

        it('should retrieve reviews for a specific store', async () => {
            const res = await request(API_URL)
                .get(`/api/reviews/${storeId}`);
            
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBeTruthy();
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0].storeId).toEqual(storeId);
        });
    });

    describe('Auth API', () => {
        it('should deny access without credentials', async () => {
            const res = await request(API_URL)
                .post('/api/login')
                .send({
                    username: '',
                    password: ''
                });
            
            expect(res.statusCode).toBe(401); // Unauthorized or Not Found based on implementation
        });

        it('should return 401 for invalid credentials', async () => {
            const res = await request(API_URL)
                .post('/api/login')
                .send({
                    username: 'invaliduser123',
                    password: 'wrongpassword'
                });
            
            expect(res.statusCode).toBe(401);
        });
    });

});
