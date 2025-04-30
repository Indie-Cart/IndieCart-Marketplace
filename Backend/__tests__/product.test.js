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
    const mockPool = {
        connect: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn()
        })
    };
    return {
        Pool: jest.fn(() => mockPool)
    };
});

// Import the server app
const app = require('../server');

describe('Product API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/products', () => {
        it('should return 400 if required fields are missing', async () => {
            const response = await request(app)
                .post('/api/products')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Missing required fields');
        });

        it('should return 400 if seller not found', async () => {
            const mockClient = {
                query: jest.fn().mockResolvedValueOnce({ rows: [] }),
                release: jest.fn()
            };
            const mockPool = new Pool();
            mockPool.connect.mockResolvedValueOnce(mockClient);

            const response = await request(app)
                .post('/api/products')
                .field('seller_id', 'nonexistent-seller')
                .field('title', 'Test Product')
                .field('description', 'Test Description')
                .field('price', '10.99')
                .field('stock', '100');

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Seller not found');
        });

        it('should successfully create a new product', async () => {
            const mockProduct = {
                product_id: 1,
                seller_id: 'test-seller',
                title: 'Test Product',
                description: 'Test Description',
                price: 10.99,
                stock: 100
            };

            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({ rows: [{ seller_id: 'test-seller' }] })
                    .mockResolvedValueOnce({ rows: [mockProduct] }),
                release: jest.fn()
            };
            const mockPool = new Pool();
            mockPool.connect.mockResolvedValueOnce(mockClient);

            const response = await request(app)
                .post('/api/products')
                .field('seller_id', mockProduct.seller_id)
                .field('title', mockProduct.title)
                .field('description', mockProduct.description)
                .field('price', mockProduct.price.toString())
                .field('stock', mockProduct.stock.toString());

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'Product added successfully');
            expect(response.body).toHaveProperty('product');
            expect(mockClient.query).toHaveBeenCalledWith(
                'INSERT INTO products (seller_id, title, description, price, stock, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [mockProduct.seller_id, mockProduct.title, mockProduct.description, mockProduct.price, mockProduct.stock, null]
            );
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
                    price: 10.99,
                    stock: 100,
                    shop_name: 'Shop 1'
                },
                {
                    product_id: 2,
                    seller_id: 'seller2',
                    title: 'Product 2',
                    description: 'Description 2',
                    price: 20.99,
                    stock: 200,
                    shop_name: 'Shop 2'
                }
            ];

            const mockClient = {
                query: jest.fn().mockResolvedValueOnce({ rows: mockProducts }),
                release: jest.fn()
            };
            const mockPool = new Pool();
            mockPool.connect.mockResolvedValueOnce(mockClient);

            const response = await request(app)
                .get('/api/products');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('product_id', 1);
            expect(response.body[1]).toHaveProperty('product_id', 2);
        });

        it('should handle database errors', async () => {
            const mockPool = new Pool();
            mockPool.connect.mockRejectedValueOnce(new Error('Database connection failed'));

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
                price: 10.99,
                stock: 100,
                shop_name: 'Shop 1'
            };

            const mockClient = {
                query: jest.fn().mockResolvedValueOnce({ rows: [mockProduct] }),
                release: jest.fn()
            };
            const mockPool = new Pool();
            mockPool.connect.mockResolvedValueOnce(mockClient);

            const response = await request(app)
                .get('/api/products/1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('product_id', 1);
            expect(response.body).toHaveProperty('title', 'Product 1');
        });

        it('should return 404 if product not found', async () => {
            const mockClient = {
                query: jest.fn().mockResolvedValueOnce({ rows: [] }),
                release: jest.fn()
            };
            const mockPool = new Pool();
            mockPool.connect.mockResolvedValueOnce(mockClient);

            const response = await request(app)
                .get('/api/products/999');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Product not found');
        });

        it('should handle database errors', async () => {
            const mockPool = new Pool();
            mockPool.connect.mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/products/1');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to fetch product');
        });
    });
}); 