const request = require('supertest');
const mockSql = jest.fn();
jest.mock('../db.js', () => mockSql);
const app = require('../server');

// Mock console.error to suppress error messages during tests
console.error = jest.fn();

describe('Seller API Endpoints', () => {
    const mockSeller = {
        seller_id: 'test-seller-id',
        shop_name: 'Test Shop'
    };

    beforeEach(() => {
        mockSql.mockReset();
    });

    describe('POST /api/sellers', () => {
        it('should successfully register a new seller', async () => {
            // Mock the seller check query
            mockSql.mockResolvedValueOnce([]); // No seller exists
            // Mock the insert query
            mockSql.mockResolvedValueOnce([]);

            const response = await request(app)
                .post('/api/sellers')
                .send(mockSeller);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({ message: 'Successfully registered as a seller' });
            expect(mockSql).toHaveBeenCalledTimes(2);
        });

        it('should return 400 if seller already exists', async () => {
            // Mock the seller check query to return existing seller
            mockSql.mockResolvedValueOnce([{ seller_id: mockSeller.seller_id }]);

            const response = await request(app)
                .post('/api/sellers')
                .send(mockSeller);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'You are already registered as a seller' });
            expect(mockSql).toHaveBeenCalledTimes(1);
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
                    image_url: 'test-image-url'
                }
            ];

            // Mock seller check query
            mockSql.mockResolvedValueOnce([
                {
                    seller_id: mockSeller.seller_id,
                    shop_name: mockSeller.shop_name,
                    product_count: 1
                }
            ]);

            // Mock products query
            mockSql.mockResolvedValueOnce(mockProducts);

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
                        image_url: expect.any(String)
                    })
                ])
            });
        });

        it('should return 404 if user is not a seller', async () => {
            // Mock seller check query to return no results
            mockSql.mockResolvedValueOnce([]);

            const response = await request(app)
                .get(`/api/seller/check/${mockSeller.seller_id}`);

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ isSeller: false });
        });
    });
});

describe('Seller Orders API Endpoints', () => {
    beforeEach(() => {
        mockSql.mockReset();
    });

    describe('GET /api/seller/orders-to-ship/:sellerId', () => {
        it('should return orders to ship for a seller', async () => {
            mockSql.mockResolvedValueOnce([{ order_id: 1, status: 'pending' }]);
            const response = await request(app).get('/api/seller/orders-to-ship/seller1');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
}); 