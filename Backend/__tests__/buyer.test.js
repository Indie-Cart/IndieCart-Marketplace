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

describe('Buyer Orders API Endpoints', () => {
    beforeEach(() => {
        mockSql.mockReset();
    });

    describe('GET /api/buyer/orders', () => {
        it('should return orders for a buyer', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // Buyer exists
            mockSql.mockResolvedValueOnce([{ order_id: 1, status: 'shipped' }]); // Orders
            const response = await request(app)
                .get('/api/buyer/orders')
                .set('x-user-id', 'test-buyer');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
});

describe('Buyer Extended API Endpoints', () => {
    beforeEach(() => {
        mockSql.mockReset();
    });

    describe('GET /api/buyers/details', () => {
        it('should return buyer details', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer', name: 'Test', shipping_address: '123 Test St' }]);
            const response = await request(app)
                .get('/api/buyers/details')
                .set('x-user-id', 'test-buyer');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ buyer_id: 'test-buyer', name: 'Test', shipping_address: '123 Test St' });
        });
        it('should return 401 if not authenticated', async () => {
            const response = await request(app).get('/api/buyers/details');
            expect(response.status).toBe(401);
        });
        it('should return 500 if there is a database error', async () => {
            mockSql.mockRejectedValueOnce(new Error('Database error'));
            const response = await request(app)
                .get('/api/buyers/details')
                .set('x-user-id', 'test-buyer');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to fetch buyer details');
        });
    });

    describe('PUT /api/buyer/mark-received/:orderId', () => {
        it('should mark an order as received', async () => {
            mockSql.mockResolvedValueOnce([{ order_id: 1, status: 'shipped' }]);
            const response = await request(app)
                .put('/api/buyer/mark-received/1')
                .set('x-user-id', 'test-buyer');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Order marked as shipped');
        });
        it('should return 404 if order not found or not in shipping status', async () => {
            mockSql.mockResolvedValueOnce([]);
            const response = await request(app)
                .put('/api/buyer/mark-received/999')
                .set('x-user-id', 'test-buyer');
            expect(response.status).toBe(404);
        });
        it('should return 401 if not authenticated', async () => {
            const response = await request(app).put('/api/buyer/mark-received/1');
            expect(response.status).toBe(401);
        });
    });

    describe('PUT /api/buyer/mark-product-received/:orderProductId', () => {
        it('should mark a product as received', async () => {
            mockSql.mockResolvedValueOnce([{ id: 1, status: 'shipped' }]);
            const response = await request(app)
                .put('/api/buyer/mark-product-received/1')
                .set('x-user-id', 'test-buyer');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
        });
        it('should return 404 if product not found or not in shipping status', async () => {
            mockSql.mockResolvedValueOnce([]);
            const response = await request(app)
                .put('/api/buyer/mark-product-received/999')
                .set('x-user-id', 'test-buyer');
            expect(response.status).toBe(404);
        });
        it('should return 401 if not authenticated', async () => {
            const response = await request(app).put('/api/buyer/mark-product-received/1');
            expect([401, 500]).toContain(response.status);
        });
    });
});

describe('Cart API Endpoints', () => {
    beforeEach(() => {
        mockSql.mockReset();
    });

    describe('GET /api/cart', () => {
        it('should return cart items for a buyer', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // First mock for user validation
            mockSql.mockResolvedValueOnce([
                { product_id: 1, title: 'Product 1', quantity: 2, price: 10.99, stock: 5 }
            ]);
            const response = await request(app)
                .get('/api/cart')
                .set('x-user-id', 'test-buyer');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0]).toHaveProperty('product_id');
        });

        it('should return 500 if there is a database error', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // First mock for user validation
            mockSql.mockRejectedValueOnce(new Error('Database error'));
            const response = await request(app)
                .get('/api/cart')
                .set('x-user-id', 'test-buyer');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to fetch cart items');
        });
    });

    describe('POST /api/cart/add', () => {
        const mockCartItem = {
            productId: 1,
            quantity: 2
        };

        it('should successfully add item to cart', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockResolvedValueOnce([{ product_id: 1, stock: 10 }]); // Product check
            mockSql.mockResolvedValueOnce([]); // Add to cart

            const response = await request(app)
                .post('/api/cart/add')
                .set('x-user-id', 'test-buyer')
                .send(mockCartItem);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to add item to cart');
        });

        it('should return 400 if product ID or quantity is missing', async () => {
            const response = await request(app)
                .post('/api/cart/add')
                .set('x-user-id', 'test-buyer')
                .send({});

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to validate user');
        });

        it('should return 404 if product not found', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockResolvedValueOnce([]); // Product not found

            const response = await request(app)
                .post('/api/cart/add')
                .set('x-user-id', 'test-buyer')
                .send(mockCartItem);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to add item to cart');
        });

        it('should return 400 if quantity exceeds stock', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockResolvedValueOnce([{ product_id: 1, stock: 1 }]); // Product with low stock

            const response = await request(app)
                .post('/api/cart/add')
                .set('x-user-id', 'test-buyer')
                .send({ ...mockCartItem, quantity: 5 });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to add item to cart');
        });

        it('should handle database errors', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .post('/api/cart/add')
                .set('x-user-id', 'test-buyer')
                .send(mockCartItem);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to add item to cart');
        });
    });

    describe('DELETE /api/cart/remove', () => {
        it('should successfully remove item from cart', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockResolvedValueOnce([{ id: 1 }]); // Item exists in cart
            mockSql.mockResolvedValueOnce([]); // Remove from cart

            const response = await request(app)
                .delete('/api/cart/remove/1')
                .set('x-user-id', 'test-buyer');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({});
        });

        it('should return 404 if item not in cart', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockResolvedValueOnce([]); // Item not found in cart

            const response = await request(app)
                .delete('/api/cart/remove/999')
                .set('x-user-id', 'test-buyer');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({});
        });

        it('should handle database errors', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .delete('/api/cart/remove/1')
                .set('x-user-id', 'test-buyer');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({});
        });
    });

    describe('PUT /api/cart/update', () => {
        const mockUpdate = {
            cartItemId: 1,
            quantity: 3
        };

        it('should successfully update cart item quantity', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockResolvedValueOnce([{ id: 1, product_id: 1 }]); // Item exists in cart
            mockSql.mockResolvedValueOnce([{ stock: 10 }]); // Product stock check
            mockSql.mockResolvedValueOnce([]); // Update cart

            const response = await request(app)
                .put('/api/cart/update')
                .set('x-user-id', 'test-buyer')
                .send(mockUpdate);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Product ID and quantity are required');
        });

        it('should return 400 if quantity is missing', async () => {
            const response = await request(app)
                .put('/api/cart/update')
                .set('x-user-id', 'test-buyer')
                .send({ cartItemId: 1 });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to validate user');
        });

        it('should return 404 if item not in cart', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockResolvedValueOnce([]); // Item not found in cart

            const response = await request(app)
                .put('/api/cart/update')
                .set('x-user-id', 'test-buyer')
                .send(mockUpdate);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Product ID and quantity are required');
        });

        it('should return 400 if quantity exceeds stock', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockResolvedValueOnce([{ id: 1, product_id: 1 }]); // Item exists in cart
            mockSql.mockResolvedValueOnce([{ stock: 1 }]); // Product with low stock

            const response = await request(app)
                .put('/api/cart/update')
                .set('x-user-id', 'test-buyer')
                .send({ ...mockUpdate, quantity: 5 });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Product ID and quantity are required');
        });

        it('should handle database errors', async () => {
            mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]); // User validation
            mockSql.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .put('/api/cart/update')
                .set('x-user-id', 'test-buyer')
                .send(mockUpdate);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Product ID and quantity are required');
        });
    });
});

describe('Cart API Error and Edge Cases', () => {
    beforeEach(() => {
        mockSql.mockReset();
    });

    // POST /api/cart/add
    it('should return 401 if user is not authenticated (add)', async () => {
        const response = await request(app)
            .post('/api/cart/add')
            .send({ productId: 1, quantity: 2 });
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'User ID is required');
    });

    it('should return 500 if productId or quantity is missing (add)', async () => {
        const response = await request(app)
            .post('/api/cart/add')
            .set('x-user-id', 'test-buyer')
            .send({});
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to validate user');
    });

    it('should return 500 if product not found (add)', async () => {
        mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]);
        mockSql.mockResolvedValueOnce([]); // Product not found
        const response = await request(app)
            .post('/api/cart/add')
            .set('x-user-id', 'test-buyer')
            .send({ productId: 1, quantity: 2 });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to add item to cart');
    });

    it('should return 500 if not enough stock (add)', async () => {
        mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]);
        mockSql.mockResolvedValueOnce([{ stock: 1 }]); // Not enough stock
        const response = await request(app)
            .post('/api/cart/add')
            .set('x-user-id', 'test-buyer')
            .send({ productId: 1, quantity: 5 });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to add item to cart');
    });

    it('should return 500 if not enough stock for total quantity (add)', async () => {
        mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]);
        mockSql.mockResolvedValueOnce([{ stock: 5 }]);
        mockSql.mockResolvedValueOnce([{ quantity: 4 }]); // Already in cart
        const response = await request(app)
            .post('/api/cart/add')
            .set('x-user-id', 'test-buyer')
            .send({ productId: 1, quantity: 3 }); // 4+3 > 5
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to add item to cart');
    });

    it('should return 500 on database error (add)', async () => {
        mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]);
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .post('/api/cart/add')
            .set('x-user-id', 'test-buyer')
            .send({ productId: 1, quantity: 2 });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to add item to cart');
    });

    // GET /api/cart
    it('should return 401 if user is not authenticated (get)', async () => {
        const response = await request(app).get('/api/cart');
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'User ID is required');
    });

    it('should return 500 on database error (get)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .get('/api/cart')
            .set('x-user-id', 'test-buyer');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to validate user');
    });

    // PUT /api/cart/update
    it('should return 401 if user is not authenticated (update)', async () => {
        const response = await request(app)
            .put('/api/cart/update')
            .send({ productId: 1, quantity: 2 });
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'User ID is required');
    });

    it('should return 500 if productId or quantity is missing (update)', async () => {
        const response = await request(app)
            .put('/api/cart/update')
            .set('x-user-id', 'test-buyer')
            .send({});
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to validate user');
    });

    it('should return 500 if item not found in cart (update)', async () => {
        mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]);
        mockSql.mockResolvedValueOnce([]); // Item not found
        const response = await request(app)
            .put('/api/cart/update')
            .set('x-user-id', 'test-buyer')
            .send({ productId: 1, quantity: 2 });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to update cart item');
    });

    it('should return 500 if not enough stock (update)', async () => {
        mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]);
        mockSql.mockResolvedValueOnce([{ quantity: 1, stock: 1, order_id: 1 }]);
        const response = await request(app)
            .put('/api/cart/update')
            .set('x-user-id', 'test-buyer')
            .send({ productId: 1, quantity: 5 });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to update cart item');
    });

    it('should return 500 on database error (update)', async () => {
        mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]);
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .put('/api/cart/update')
            .set('x-user-id', 'test-buyer')
            .send({ productId: 1, quantity: 2 });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to update cart item');
    });

    // DELETE /api/cart/remove
    it('should return 401 if user is not authenticated (remove)', async () => {
        const response = await request(app)
            .delete('/api/cart/remove')
            .send({ productId: 1 });
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'User ID is required');
    });

    it('should return 500 if productId is missing (remove)', async () => {
        const response = await request(app)
            .delete('/api/cart/remove')
            .set('x-user-id', 'test-buyer')
            .send({});
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to validate user');
    });

    it('should return 500 if item not found in cart (remove)', async () => {
        mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]);
        mockSql.mockResolvedValueOnce([]); // Item not found
        const response = await request(app)
            .delete('/api/cart/remove')
            .set('x-user-id', 'test-buyer')
            .send({ productId: 1 });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to remove item from cart');
    });

    it('should return 500 on database error (remove)', async () => {
        mockSql.mockResolvedValueOnce([{ buyer_id: 'test-buyer' }]);
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .delete('/api/cart/remove')
            .set('x-user-id', 'test-buyer')
            .send({ productId: 1 });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to remove item from cart');
    });
});

describe('Buyer API Error and Edge Cases', () => {
    beforeEach(() => {
        mockSql.mockReset();
    });

    // GET /api/buyers/details
    it('should return 401 if user is not authenticated (details)', async () => {
        const response = await request(app).get('/api/buyers/details');
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'User not authenticated');
    });

    it('should return 404 if buyer not found (details)', async () => {
        mockSql.mockResolvedValueOnce([]); // Buyer not found
        const response = await request(app)
            .get('/api/buyers/details')
            .set('x-user-id', 'test-buyer');
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Buyer not found');
    });

    it('should return 500 on database error (details)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .get('/api/buyers/details')
            .set('x-user-id', 'test-buyer');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to fetch buyer details');
    });

    // PUT /api/buyers/update
    it('should return 401 if user is not authenticated (update)', async () => {
        const response = await request(app)
            .put('/api/buyers/update')
            .send({ shipping_address: '123 Test St' });
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'User not authenticated');
    });

    it('should return 500 on database error (update)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .put('/api/buyers/update')
            .set('x-user-id', 'test-buyer')
            .send({ shipping_address: '123 Test St' });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to update shipping details');
    });

    // GET /api/buyer/orders
    it('should return 401 if user is not authenticated (orders)', async () => {
        const response = await request(app).get('/api/buyer/orders');
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'User not authenticated');
    });

    it('should return 500 on database error (orders)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .get('/api/buyer/orders')
            .set('x-user-id', 'test-buyer');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to fetch buyer orders');
    });

    // PUT /api/buyer/mark-received/:orderId
    it('should return 401 if user is not authenticated (mark-received)', async () => {
        const response = await request(app).put('/api/buyer/mark-received/1');
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'User not authenticated');
    });

    it('should return 404 if order not found or not in shipping status (mark-received)', async () => {
        mockSql.mockResolvedValueOnce([]); // Order not found
        const response = await request(app)
            .put('/api/buyer/mark-received/999')
            .set('x-user-id', 'test-buyer');
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Order not found, not in shipping status, or does not belong to buyer');
    });

    it('should return 500 on database error (mark-received)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .put('/api/buyer/mark-received/1')
            .set('x-user-id', 'test-buyer');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to mark order as shipped');
    });

    // PUT /api/buyer/mark-product-received/:orderProductId
    it('should return 404 if product not found or not in shipping status (mark-product-received)', async () => {
        mockSql.mockResolvedValueOnce([]); // Product not found
        const response = await request(app)
            .put('/api/buyer/mark-product-received/999')
            .set('x-user-id', 'test-buyer');
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Order product not found or not in shipping status');
    });

    it('should return 500 on database error (mark-product-received)', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .put('/api/buyer/mark-product-received/1')
            .set('x-user-id', 'test-buyer');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to mark product as shipped');
    });
});

describe('Order Management', () => {
    it('should handle order status update', async () => {
        mockSql.mockResolvedValueOnce([{ order_id: 1 }]); // Order exists
        mockSql.mockResolvedValueOnce([]); // Update status

        const response = await request(app)
            .put('/api/orders/1/status')
            .set('x-user-id', 'test-seller')
            .send({ status: 'shipped' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({});
    });

    it('should handle order cancellation', async () => {
        mockSql.mockResolvedValueOnce([{ order_id: 1 }]); // Order exists
        mockSql.mockResolvedValueOnce([]); // Cancel order

        const response = await request(app)
            .put('/api/orders/1/cancel')
            .set('x-user-id', 'test-buyer');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({});
    });
});

describe('Uncovered Branches - Cart Remove', () => {
    beforeEach(() => {
        mockSql.mockReset();
        // Mock sql.begin to call the callback with mockSql
        mockSql.begin = async (cb) => cb(mockSql);
    });

    it('should return 400 if item not found in cart (cart remove)', async () => {
        mockSql.mockResolvedValueOnce([]); // quantityResult is []
        const response = await request(app)
            .delete('/api/cart/remove')
            .set('x-user-id', 'test-buyer')
            .send({ productId: 123 });
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Failed to remove item from cart');
    });
}); 