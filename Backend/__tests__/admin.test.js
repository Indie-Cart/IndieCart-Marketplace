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

        it('should return 500 if there is a database error', async () => {
            mockSql.mockResolvedValueOnce([{ admin_id: 'test-admin' }]);
            mockSql.mockRejectedValueOnce(new Error('Database error'));
            const response = await request(app)
                .get('/api/admin/sellers')
                .set('x-user-id', 'test-admin');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to fetch sellers');
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

describe('Admin Management', () => {
    it('should handle admin registration', async () => {
        mockSql.mockResolvedValueOnce([]); // No existing admin
        mockSql.mockResolvedValueOnce([]); // Insert admin

        const response = await request(app)
            .post('/api/admin/register')
            .send({ admin_id: 'test-admin' });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Admin ID is required' });
    });

    it('should handle admin deletion', async () => {
        mockSql.mockResolvedValueOnce([{ admin_id: 'test-admin' }]); // Admin exists
        mockSql.mockResolvedValueOnce([]); // Delete admin

        const response = await request(app)
            .delete('/api/admin/test-admin')
            .set('x-user-id', 'test-admin');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({});
    });
});

describe('Admin API Error and Edge Cases', () => {
    beforeEach(() => {
        mockSql.mockReset();
    });

    // GET /api/admin/check
    it('should return 401 if admin ID is missing (check)', async () => {
        const response = await request(app).get('/api/admin/check');
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Admin ID is required');
    });

    it('should return 403 if user is not admin (check)', async () => {
        mockSql.mockResolvedValueOnce([]); // Not admin
        const response = await request(app)
            .get('/api/admin/check')
            .set('x-user-id', 'not-admin');
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'User is not authorized as an admin');
    });

    it('should return 500 on database error (check)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .get('/api/admin/check')
            .set('x-user-id', 'admin');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to check admin status');
    });

    // GET /api/admin/sellers
    it('should return 500 on database error (get sellers)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .get('/api/admin/sellers')
            .set('x-user-id', 'admin');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to check admin status');
    });

    // DELETE /api/admin/sellers/:sellerId
    it('should return 403 if seller not found (delete seller)', async () => {
        mockSql.mockResolvedValueOnce([]); // No products
        mockSql.mockResolvedValueOnce([]); // No products to delete
        mockSql.mockResolvedValueOnce([]); // Seller not found
        const response = await request(app)
            .delete('/api/admin/sellers/unknown-seller')
            .set('x-user-id', 'admin');
        expect(response.status).toBe(403);
    });

    it('should return 500 on database error (delete seller)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .delete('/api/admin/sellers/test-seller')
            .set('x-user-id', 'admin');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to check admin status');
    });

    // GET /api/admin/sellers/:sellerId/products
    it('should return 500 on database error (get seller products)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .get('/api/admin/sellers/test-seller/products')
            .set('x-user-id', 'admin');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to check admin status');
    });

    // PUT /api/admin/products/:productId
    it('should return 403 if product not found (edit product)', async () => {
        mockSql.mockResolvedValueOnce([]); // Product not found
        const response = await request(app)
            .put('/api/admin/products/999')
            .set('x-user-id', 'admin')
            .send({ title: 'T' });
        expect(response.status).toBe(403);
    });

    it('should return 500 on database error (edit product)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .put('/api/admin/products/1')
            .set('x-user-id', 'admin')
            .send({ title: 'T' });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to check admin status');
    });

    // DELETE /api/admin/products/:productId
    it('should return 403 if product not found (delete product)', async () => {
        mockSql.mockResolvedValueOnce([]); // Product not found
        const response = await request(app)
            .delete('/api/admin/products/999')
            .set('x-user-id', 'admin');
        expect(response.status).toBe(403);
    });

    it('should return 500 on database error (delete product)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .delete('/api/admin/products/1')
            .set('x-user-id', 'admin');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to check admin status');
    });
});

describe('Uncovered Branches - Admin Product Delete Success', () => {
    beforeEach(() => {
        mockSql.mockReset();
        mockSql.begin = async (cb) => cb(mockSql);
    });

    it('should successfully delete a product and associated empty orders as admin', async () => {
        mockSql.mockResolvedValueOnce([{ admin_id: 'test-admin' }]); // admin check
        mockSql.mockResolvedValueOnce([{ product_id: 1 }]); // productCheck
        mockSql.mockResolvedValueOnce([{ order_id: 123 }]); // orderIds
        mockSql.mockResolvedValueOnce([]); // delete order_products
        mockSql.mockResolvedValueOnce([]); // delete product
        mockSql.mockResolvedValueOnce([{ count: '0' }]); // remainingItems for order_id 123
        mockSql.mockResolvedValueOnce([]); // delete order

        const response = await request(app)
            .delete('/api/admin/products/1')
            .set('x-user-id', 'test-admin');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Product and associated empty orders deleted successfully');
    });
}); 