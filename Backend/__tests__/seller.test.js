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

describe('Seller Extended API Endpoints', () => {
    beforeEach(() => {
        mockSql.mockReset();
    });

    describe('PUT /api/seller/mark-shipped/:orderId', () => {
        it('should mark an order as shipped', async () => {
            mockSql.mockResolvedValueOnce([{ order_id: 1, status: 'shipping' }]);
            const response = await request(app).put('/api/seller/mark-shipped/1');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Order marked as shipping');
        });
        it('should return 404 if order not found or not in paid status', async () => {
            mockSql.mockResolvedValueOnce([]);
            const response = await request(app).put('/api/seller/mark-shipped/999');
            expect(response.status).toBe(404);
        });
        it('should return 500 if there is a database error', async () => {
            mockSql.mockRejectedValueOnce(new Error('Database error'));
            const response = await request(app).put('/api/seller/mark-shipped/1');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to mark order as shipped');
        });
    });

    describe('GET /api/seller/orders-shipping/:sellerId', () => {
        it('should return shipping orders for a seller', async () => {
            mockSql.mockResolvedValueOnce([{ order_id: 1, buyer_id: 'b1', status: 'shipping' }]);
            mockSql.mockResolvedValueOnce([{ product_id: 1, title: 'P', description: 'D', price: 10, image_url: '', quantity: 2 }]);
            const response = await request(app).get('/api/seller/orders-shipping/seller1');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/seller/products-to-ship/:sellerId', () => {
        it('should return products to ship for a seller', async () => {
            mockSql.mockResolvedValueOnce([{ product_id: 1, title: 'P', description: 'D', price: 10, image_url: '', quantity: 2 }]);
            const response = await request(app).get('/api/seller/products-to-ship/seller1');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/seller/products-shipping/:sellerId', () => {
        it('should return products currently shipping for a seller', async () => {
            mockSql.mockResolvedValueOnce([{ product_id: 1, title: 'P', description: 'D', price: 10, image_url: '', quantity: 2 }]);
            const response = await request(app).get('/api/seller/products-shipping/seller1');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('PUT /api/seller/mark-product-shipped/:orderProductId', () => {
        it('should mark a product as shipped', async () => {
            mockSql.mockResolvedValueOnce([{ id: 1, status: 'shipped' }]);
            const response = await request(app).put('/api/seller/mark-product-shipped/1');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Product marked as shipping');
        });
        it('should return 404 if product not found or not in shipping status', async () => {
            mockSql.mockResolvedValueOnce([]);
            const response = await request(app).put('/api/seller/mark-product-shipped/999');
            expect(response.status).toBe(404);
        });
        it('should return 500 if there is a database error', async () => {
            mockSql.mockRejectedValueOnce(new Error('Database error'));
            const response = await request(app).put('/api/seller/mark-product-shipped/1');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to mark product as shipped');
        });
    });

    describe('GET /api/seller/products-shipped/:sellerId', () => {
        it('should return shipped products for a seller', async () => {
            mockSql.mockResolvedValueOnce([{ product_id: 1, title: 'P', description: 'D', price: 10, image_url: '', quantity: 2 }]);
            const response = await request(app).get('/api/seller/products-shipped/seller1');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/seller/reports/sales-trends/:sellerId', () => {
        it('should return sales trends for a seller', async () => {
            mockSql.mockResolvedValueOnce([{ order_id: 1, total_quantity: 2, total_revenue: 20 }]);
            const response = await request(app).get('/api/seller/reports/sales-trends/seller1');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
        it('should return 500 if there is a database error', async () => {
            mockSql.mockRejectedValueOnce(new Error('Database error'));
            const response = await request(app).get('/api/seller/reports/sales-trends/seller1');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to fetch sales trends');
        });
    });

    describe('GET /api/seller/reports/inventory/:sellerId', () => {
        it('should return inventory for a seller', async () => {
            mockSql.mockResolvedValueOnce([{ product_id: 1, title: 'P', stock: 10 }]);
            const response = await request(app).get('/api/seller/reports/inventory/seller1');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/seller/reports/custom/:sellerId', () => {
        it('should return custom report for a seller', async () => {
            mockSql.mockResolvedValueOnce([{ custom: 'data' }]);
            const response = await request(app).get('/api/seller/reports/custom/seller1');
            expect(response.status).toBe(200);
            expect(typeof response.body).toBe('string');
        });
    });
}); 