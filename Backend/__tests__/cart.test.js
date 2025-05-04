const request = require('supertest');
const { Pool } = require('pg');

// Mock console.error to suppress error messages in tests
const originalConsoleError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalConsoleError;
});

// Mock the pg module
jest.mock('pg', () => {
    const mockQuery = jest.fn();
    const mockRelease = jest.fn();
    const mockClient = {
        query: mockQuery,
        release: mockRelease
    };
    const mockPool = {
        connect: jest.fn(() => Promise.resolve(mockClient))
    };
    return { Pool: jest.fn(() => mockPool) };
});

// Import the server app
const app = require('../server');

describe('Cart API Endpoints', () => {
    let mockClient;
    const mockBuyerId = 'test-buyer';
    const mockProduct = {
        productId: 1,
        quantity: 2
    };

    beforeEach(async () => {
        const pool = new Pool();
        mockClient = await pool.connect();
        mockClient.query.mockReset();
    });

    describe('POST /api/cart/add', () => {
        it('should successfully add item to cart', async () => {
            // Mock buyer validation
            mockClient.query.mockResolvedValueOnce({ rows: [{ buyer_id: mockBuyerId }] });
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock product stock check
            mockClient.query.mockResolvedValueOnce({ rows: [{ stock: 10 }] });
            // Mock cart check
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock new cart creation
            mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 1 }] });
            // Mock adding item to cart
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/cart/add')
                .set('x-user-id', mockBuyerId)
                .send(mockProduct);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Item added to cart successfully');
        });

        it('should return 401 if user not authenticated', async () => {
            const response = await request(app)
                .post('/api/cart/add')
                .send(mockProduct);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'User ID is required');
        });

        it('should return 400 if product not found', async () => {
            // Mock buyer validation
            mockClient.query.mockResolvedValueOnce({ rows: [{ buyer_id: mockBuyerId }] });
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock product check - not found
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/cart/add')
                .set('x-user-id', mockBuyerId)
                .send(mockProduct);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Product not found');
        });

        it('should return 400 if not enough stock', async () => {
            // Mock buyer validation
            mockClient.query.mockResolvedValueOnce({ rows: [{ buyer_id: mockBuyerId }] });
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock product check - not enough stock
            mockClient.query.mockResolvedValueOnce({ rows: [{ stock: 1 }] });

            const response = await request(app)
                .post('/api/cart/add')
                .set('x-user-id', mockBuyerId)
                .send(mockProduct);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Not enough stock available');
        });
    });

    describe('PUT /api/cart/update', () => {
        it('should successfully update cart item quantity', async () => {
            // Mock buyer validation
            mockClient.query.mockResolvedValueOnce({ rows: [{ buyer_id: mockBuyerId }] });
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock current cart item check
            mockClient.query.mockResolvedValueOnce({ 
                rows: [{ quantity: 1, stock: 10, order_id: 1 }] 
            });
            // Mock quantity update
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .put('/api/cart/update')
                .set('x-user-id', mockBuyerId)
                .send({ productId: 1, quantity: 3 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Cart item updated successfully');
        });

        it('should return 400 if item not in cart', async () => {
            // Mock buyer validation
            mockClient.query.mockResolvedValueOnce({ rows: [{ buyer_id: mockBuyerId }] });
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock cart item check - not found
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .put('/api/cart/update')
                .set('x-user-id', mockBuyerId)
                .send({ productId: 1, quantity: 3 });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Item not found in cart');
        });

        it('should return 400 if not enough stock', async () => {
            // Mock buyer validation
            mockClient.query.mockResolvedValueOnce({ rows: [{ buyer_id: mockBuyerId }] });
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock cart item check - not enough stock
            mockClient.query.mockResolvedValueOnce({ 
                rows: [{ quantity: 1, stock: 1, order_id: 1 }] 
            });

            const response = await request(app)
                .put('/api/cart/update')
                .set('x-user-id', mockBuyerId)
                .send({ productId: 1, quantity: 3 });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Not enough stock available');
        });
    });

    describe('DELETE /api/cart/remove', () => {
        it('should successfully remove item from cart', async () => {
            // Mock buyer validation
            mockClient.query.mockResolvedValueOnce({ rows: [{ buyer_id: mockBuyerId }] });
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock cart item check
            mockClient.query.mockResolvedValueOnce({ 
                rows: [{ quantity: 1, order_id: 1 }] 
            });
            // Mock item removal
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock remaining items check
            mockClient.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const response = await request(app)
                .delete('/api/cart/remove')
                .set('x-user-id', mockBuyerId)
                .send({ productId: 1 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Item removed from cart successfully');
        });

        it('should delete empty cart after removing last item', async () => {
            // Mock buyer validation
            mockClient.query.mockResolvedValueOnce({ rows: [{ buyer_id: mockBuyerId }] });
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock cart item check
            mockClient.query.mockResolvedValueOnce({ 
                rows: [{ quantity: 1, order_id: 1 }] 
            });
            // Mock item removal
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock remaining items check
            mockClient.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
            // Mock cart deletion
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .delete('/api/cart/remove')
                .set('x-user-id', mockBuyerId)
                .send({ productId: 1 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Item removed from cart successfully');
        });

        it('should return 400 if item not in cart', async () => {
            // Mock buyer validation
            mockClient.query.mockResolvedValueOnce({ rows: [{ buyer_id: mockBuyerId }] });
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock cart item check - not found
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .delete('/api/cart/remove')
                .set('x-user-id', mockBuyerId)
                .send({ productId: 1 });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Item not found in cart');
        });
    });
}); 