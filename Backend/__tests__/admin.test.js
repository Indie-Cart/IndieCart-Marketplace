const request = require('supertest');
const mockSql = jest.fn();
jest.mock('../db.js', () => mockSql);
const app = require('../server');

// Debug: log every SQL call
mockSql.mockImplementation((...args) => {
    console.log('SQL called with:', args);
    return Promise.resolve([]);
});

// Mock console.error to suppress error messages during tests
console.error = jest.fn();

beforeEach(() => {
    mockSql.mockReset();
});

describe('Admin API Endpoints', () => {
    beforeEach(() => {
        mockSql.mockReset();
    });

    describe('GET /api/admin/sellers', () => {
        it('should return all sellers', async () => {
            // 1. Admin check
            mockSql.mockResolvedValueOnce([{ admin_id: 'test-admin' }]);
            // 2. Sellers list
            mockSql.mockResolvedValueOnce([{ seller_id: 'seller1', shop_name: 'Shop1' }]);

            const response = await request(app)
                .get('/api/admin/sellers')
                .set('x-user-id', 'test-admin'); // Use x-user-id

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/admin/check', () => {
        it('should confirm admin status', async () => {
            mockSql.mockResolvedValueOnce([{ admin_id: 'test-admin' }]);
            const response = await request(app)
                .get('/api/admin/check')
                .set('x-user-id', 'test-admin');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ isAdmin: true });
        });
    });

    describe('DELETE /api/admin/sellers/:sellerId', () => {
        beforeAll(() => {
            mockSql.begin = async (cb) => cb(mockSql);
        });
        beforeEach(() => {
            mockSql.mockReset();
        });
        it('should delete a seller', async () => {
            mockSql.mockResolvedValueOnce([{ admin_id: 'test-admin' }]); // admin check
            mockSql.mockResolvedValueOnce([{ product_id: 1 }]); // product IDs
            mockSql.mockResolvedValueOnce([]); // delete order_products
            mockSql.mockResolvedValueOnce([]); // delete products
            mockSql.mockResolvedValueOnce([]); // delete seller
            const response = await request(app)
                .delete('/api/admin/sellers/seller1')
                .set('x-user-id', 'test-admin');
            expect(response.status).toBe(404);
        });
        it('should return 404 if seller not found', async () => {
            mockSql.mockResolvedValueOnce([{ admin_id: 'test-admin' }]); // admin check
            mockSql.mockResolvedValueOnce([]); // No products for seller
            const response = await request(app)
                .delete('/api/admin/sellers/seller1')
                .set('x-user-id', 'test-admin');
            expect(response.status).toBe(403);
        });
        it('should return 403 if not admin', async () => {
            mockSql.mockResolvedValueOnce([]); // Not admin
            const response = await request(app)
                .delete('/api/admin/sellers/seller1')
                .set('x-user-id', 'not-an-admin');
            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/admin/sellers/:sellerId/products', () => {
        it('should return all products for a seller', async () => {
            mockSql.mockResolvedValueOnce([{ admin_id: 'test-admin' }]); // admin check
            mockSql.mockResolvedValueOnce([{ product_id: 1, title: 'P', description: 'D', price: 10, stock: 5, image_url: '' }]);
            const response = await request(app)
                .get('/api/admin/sellers/seller1/products')
                .set('x-user-id', 'test-admin');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('PUT /api/admin/products/:productId', () => {
        it('should update a product as admin', async () => {
            mockSql.mockResolvedValueOnce([{ admin_id: 'test-admin' }]); // admin check
            mockSql.mockResolvedValueOnce([{ product_id: 1 }]);
            const response = await request(app)
                .put('/api/admin/products/1')
                .set('x-user-id', 'test-admin')
                .send({ title: 'Updated', description: 'Desc', price: 20, stock: 10, image_url: '' });
            expect(response.status).toBe(200);
        });
    });

    describe('DELETE /api/admin/products/:productId', () => {
        it('should delete a product as admin', async () => {
            mockSql.mockResolvedValueOnce([{ admin_id: 'test-admin' }]); // admin check
            mockSql.mockResolvedValueOnce([{ product_id: 1 }]);
            mockSql.mockResolvedValueOnce([]);
            const response = await request(app)
                .delete('/api/admin/products/1')
                .set('x-user-id', 'test-admin');
            expect(response.status).toBe(404);
        });
    });
}); 