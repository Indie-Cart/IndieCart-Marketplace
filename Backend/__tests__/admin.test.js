const request = require('supertest');
const mockSql = jest.fn();
jest.mock('../db.js', () => mockSql);
const app = require('../server');

// Mock console.error to suppress error messages during tests
console.error = jest.fn();

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
}); 