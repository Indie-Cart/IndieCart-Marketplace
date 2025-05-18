const request = require('supertest');
const mockSql = jest.fn();
jest.mock('../db.js', () => mockSql);
const app = require('../server');

// Mock console.error to suppress error messages during tests
console.error = jest.fn();

beforeEach(() => {
    mockSql.mockReset();
});

describe('Buyer API Endpoints', () => {
    const mockBuyer = {
        buyer_id: 'test-buyer'
    };

    const mockShippingDetails = {
        shipping_address: '123 Test St',
        suburb: 'Test Suburb',
        city: 'Test City',
        province: 'Test Province',
        postal_code: '1234',
        name: 'Test Name',
        number: '1234567890'
    };

    describe('POST /api/buyers', () => {
        it('should successfully add new buyer', async () => {
            mockSql.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/buyers')
                .send(mockBuyer);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Buyer added successfully');
        });

        it('should return 400 if buyer ID is missing', async () => {
            const response = await request(app)
                .post('/api/buyers')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Buyer ID is required');
        });

        it('should handle database errors', async () => {
            mockSql.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .post('/api/buyers')
                .send(mockBuyer);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to add buyer');
        });
    });

    describe('PUT /api/buyers/update', () => {
        it('should successfully update buyer shipping details', async () => {
            mockSql.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .put('/api/buyers/update')
                .set('x-user-id', mockBuyer.buyer_id)
                .send(mockShippingDetails);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Shipping details updated successfully');
        });

        it('should return 401 if user not authenticated', async () => {
            const response = await request(app)
                .put('/api/buyers/update')
                .send(mockShippingDetails);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'User not authenticated');
        });

        it('should handle database errors', async () => {
            mockSql.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .put('/api/buyers/update')
                .set('x-user-id', mockBuyer.buyer_id)
                .send(mockShippingDetails);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to update shipping details');
        });
    });

    describe('validateUser middleware', () => {
        it('should create buyer if they do not exist', async () => {
            // Mock buyer check - not found
            mockSql.mockResolvedValueOnce({ rows: [] });
            // Mock buyer creation
            mockSql.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/cart') // Using cart endpoint as it uses validateUser middleware
                .set('x-user-id', mockBuyer.buyer_id);

            expect(response.status).not.toBe(401);
            expect(mockSql).toHaveBeenCalledTimes(2);
        });

        it('should return 401 if user ID is missing', async () => {
            const response = await request(app)
                .get('/api/cart');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'User ID is required');
        });

        it('should handle database errors', async () => {
            mockSql.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .get('/api/cart')
                .set('x-user-id', mockBuyer.buyer_id);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to validate user');
        });
    });
}); 