const request = require('supertest');
const app = require('../server');
const { Pool } = require('pg');

// Mock console.error to suppress error messages during tests
console.error = jest.fn();

// Mock pg module
jest.mock('pg', () => {
    const mockQuery = jest.fn();
    const mockRelease = jest.fn();
    const mockClient = {
        query: mockQuery,
        release: mockRelease
    };
    const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient)
    };
    return { Pool: jest.fn(() => mockPool) };
});

describe('Seller API Endpoints', () => {
    let mockClient;
    const mockSeller = {
        seller_id: 'test-seller-id',
        shop_name: 'Test Shop'
    };

    beforeEach(() => {
        // Get a new mock client for each test
        const pool = new Pool();
        mockClient = pool.connect();
    });

    describe('POST /api/sellers', () => {
        it('should successfully register a new seller', async () => {
            // Mock the seller check query
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock the insert query
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/sellers')
                .send(mockSeller);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({ message: 'Successfully registered as a seller' });
            expect(mockClient.query).toHaveBeenCalledTimes(2);
        });

        it('should return 400 if seller already exists', async () => {
            // Mock the seller check query to return existing seller
            mockClient.query.mockResolvedValueOnce({ rows: [{ seller_id: mockSeller.seller_id }] });

            const response = await request(app)
                .post('/api/sellers')
                .send(mockSeller);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'You are already registered as a seller' });
            expect(mockClient.query).toHaveBeenCalledTimes(1);
        });

        it('should return 400 if required fields are missing', async () => {
            const response = await request(app)
                .post('/api/sellers')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Seller ID and shop name are required' });
        });
    });

    describe('GET /api/seller/check/:userId', () => {
        it('should return seller info and products if user is a seller', async () => {
            const mockProducts = [
                {
                    product_id: 1,
                    title: 'Test Product',
                    description: 'Test Description',
                    price: 10.99,
                    stock: 5,
                    image: Buffer.from('test-image')
                }
            ];

            // Mock seller check query
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    seller_id: mockSeller.seller_id,
                    shop_name: mockSeller.shop_name,
                    product_count: 1
                }]
            });

            // Mock products query
            mockClient.query.mockResolvedValueOnce({
                rows: mockProducts
            });

            const response = await request(app)
                .get(`/api/seller/check/${mockSeller.seller_id}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                isSeller: true,
                sellerInfo: {
                    seller_id: mockSeller.seller_id,
                    shop_name: mockSeller.shop_name,
                    product_count: 1
                },
                products: expect.arrayContaining([
                    expect.objectContaining({
                        product_id: 1,
                        title: 'Test Product',
                        description: 'Test Description',
                        price: 10.99,
                        stock: 5,
                        image: expect.any(String)
                    })
                ])
            });
        });

        it('should return 404 if user is not a seller', async () => {
            // Mock seller check query to return no results
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get(`/api/seller/check/${mockSeller.seller_id}`);

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ isSeller: false });
        });
    });
}); 