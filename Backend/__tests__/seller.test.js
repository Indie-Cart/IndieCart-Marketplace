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
    let mockQuery;
    const mockSeller = {
        seller_id: 'test-seller-id',
        shop_name: 'Test Shop'
    };

    beforeEach(() => {
        // Create a new mock query function for each test
        mockQuery = jest.fn();
        const mockRelease = jest.fn();
        mockClient = {
            query: mockQuery,
            release: mockRelease
        };
        
        // Update the pool's connect to return our mock client
        const pool = new Pool();
        pool.connect.mockResolvedValue(mockClient);
    });

    describe('POST /api/sellers', () => {
        it('should successfully register a new seller', async () => {
            // Mock the seller check query
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // Mock the insert query
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/sellers')
                .send(mockSeller);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({ message: 'Successfully registered as a seller' });
            expect(mockQuery).toHaveBeenCalledTimes(2);
        });

        it('should return 400 if seller already exists', async () => {
            // Mock the seller check query to return existing seller
            mockQuery.mockResolvedValueOnce({ rows: [{ seller_id: mockSeller.seller_id }] });

            const response = await request(app)
                .post('/api/sellers')
                .send(mockSeller);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'You are already registered as a seller' });
            expect(mockQuery).toHaveBeenCalledTimes(1);
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
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    seller_id: mockSeller.seller_id,
                    shop_name: mockSeller.shop_name,
                    product_count: 1
                }]
            });

            // Mock products query
            mockQuery.mockResolvedValueOnce({
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
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get(`/api/seller/check/${mockSeller.seller_id}`);

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ isSeller: false });
        });
    });
}); 