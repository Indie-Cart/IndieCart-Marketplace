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

describe('Product API Endpoints', () => {
    let mockClient;
    const mockProduct = {
        seller_id: 'test-seller',
        title: 'Test Product',
        description: 'Test Description',
        price: '10.99', // Send as string to match form data
        stock: '100'    // Send as string to match form data
    };

    beforeEach(async () => {
        const pool = new Pool();
        mockClient = await pool.connect();
        mockClient.query.mockReset();
    });

    describe('POST /api/products', () => {
        it('should successfully create a new product', async () => {
            // Mock seller check
            mockClient.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
            // Mock product insertion
            mockClient.query.mockResolvedValueOnce({ 
                rows: [{
                    ...mockProduct,
                    price: parseFloat(mockProduct.price), // Convert to numeric
                    stock: parseInt(mockProduct.stock, 10) // Convert to int4
                }]
            });

            const response = await request(app)
                .post('/api/products')
                .send(mockProduct);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'Product added successfully');
            expect(response.body).toHaveProperty('product');
            
            // Check that the queries were called in the correct order with correct parameters
            expect(mockClient.query).toHaveBeenNthCalledWith(1,
                'SELECT 1 FROM seller WHERE seller_id = $1',
                [mockProduct.seller_id]
            );

            // Get the actual query that was called
            const actualQuery = mockClient.query.mock.calls[1][0];
            const expectedQuery = 'INSERT INTO products (seller_id, title, description, price, stock, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
            
            // Compare normalized queries (remove extra whitespace)
            expect(actualQuery.replace(/\s+/g, ' ').trim()).toBe(expectedQuery.replace(/\s+/g, ' ').trim());
            
            // Check the parameters separately
            expect(mockClient.query.mock.calls[1][1]).toEqual([
                mockProduct.seller_id,
                mockProduct.title,
                mockProduct.description,
                parseFloat(mockProduct.price),
                parseInt(mockProduct.stock, 10),
                null
            ]);
        });

        it('should return 400 if seller does not exist', async () => {
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/api/products')
                .send(mockProduct);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Seller not found');
            expect(mockClient.query).toHaveBeenCalledTimes(1);
            expect(mockClient.query).toHaveBeenCalledWith(
                'SELECT 1 FROM seller WHERE seller_id = $1',
                [mockProduct.seller_id]
            );
        });

        it('should return 400 if required fields are missing', async () => {
            const response = await request(app)
                .post('/api/products')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Missing required fields');
            expect(mockClient.query).not.toHaveBeenCalled();
        });
    });

    describe('GET /api/products', () => {
        it('should return all products', async () => {
            const mockProducts = [
                {
                    product_id: 1,
                    seller_id: 'seller1',
                    title: 'Product 1',
                    description: 'Description 1',
                    price: 10.99, // numeric type
                    stock: 100,   // int4 type
                    shop_name: 'Shop 1'
                },
                {
                    product_id: 2,
                    seller_id: 'seller2',
                    title: 'Product 2',
                    description: 'Description 2',
                    price: 20.99, // numeric type
                    stock: 200,   // int4 type
                    shop_name: 'Shop 2'
                }
            ];

            mockClient.query.mockResolvedValueOnce({ rows: mockProducts });

            const response = await request(app)
                .get('/api/products');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('product_id', 1);
            expect(response.body[1]).toHaveProperty('product_id', 2);
        });

        it('should handle database errors', async () => {
            mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/products');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to fetch products');
        });
    });

    describe('GET /api/products/:productId', () => {
        it('should return a single product', async () => {
            const mockProduct = {
                product_id: 1,
                seller_id: 'seller1',
                title: 'Product 1',
                description: 'Description 1',
                price: 10.99, // numeric type
                stock: 100,   // int4 type
                shop_name: 'Shop 1'
            };

            mockClient.query.mockResolvedValueOnce({ rows: [mockProduct] });

            const response = await request(app)
                .get('/api/products/1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('product_id', 1);
            expect(response.body).toHaveProperty('title', 'Product 1');
        });

        it('should return 404 if product not found', async () => {
            mockClient.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .get('/api/products/999');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Product not found');
        });

        it('should handle database errors', async () => {
            mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/products/1');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to fetch product');
        });
    });
}); 