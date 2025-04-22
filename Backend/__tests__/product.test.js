const request = require('supertest');
const sql = require('mssql');

// Mock the sql module
jest.mock('mssql', () => {
    const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({ recordset: [] })
    };
    const mockPool = {
        request: jest.fn().mockReturnValue(mockRequest)
    };
    return {
        connect: jest.fn().mockResolvedValue(mockPool),
        close: jest.fn(),
        VarChar: jest.fn(),
        Int: jest.fn(),
        Decimal: jest.fn(),
        VarBinary: jest.fn(),
        MAX: Number.MAX_SAFE_INTEGER,
        request: jest.fn().mockReturnValue(mockRequest)
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

        it('should return 400 if seller does not exist', async () => {
            const mockPool = await sql.connect();
            const mockRequest = mockPool.request();
            mockRequest.query.mockResolvedValueOnce({ recordset: [] }); // Empty result means seller not found

            const response = await request(app)
                .post('/api/products')
                .field('seller_id', 'non-existent-seller')
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

            const mockPool = await sql.connect();
            const mockRequest = mockPool.request();
            // First query for seller check
            mockRequest.query
                .mockResolvedValueOnce({ recordset: [{ seller_id: 'test-seller' }] })
                // Second query for product insertion
                .mockResolvedValueOnce({ recordset: [mockProduct] });

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
            expect(sql.connect).toHaveBeenCalledWith({
                user: 'sqlserveradmin',
                password: 'Indiecart123',
                server: 'indiecartserver2.database.windows.net',
                database: 'IndieCartdb2',
                options: {
                    encrypt: true,
                    enableArithAbort: true
                }
            });
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

            const mockPool = await sql.connect();
            const mockRequest = mockPool.request();
            mockRequest.query.mockResolvedValueOnce({ recordset: mockProducts });

            const response = await request(app)
                .get('/api/products');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('product_id', 1);
            expect(response.body[1]).toHaveProperty('product_id', 2);
        });

        it('should handle database errors', async () => {
            sql.connect.mockRejectedValueOnce(new Error('Database connection failed'));

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

            const mockPool = await sql.connect();
            const mockRequest = mockPool.request();
            mockRequest.query.mockResolvedValueOnce({ recordset: [mockProduct] });

            const response = await request(app)
                .get('/api/products/1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('product_id', 1);
            expect(response.body).toHaveProperty('title', 'Product 1');
        });

        it('should return 404 if product not found', async () => {
            const mockPool = await sql.connect();
            const mockRequest = mockPool.request();
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const response = await request(app)
                .get('/api/products/999');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Product not found');
        });

        it('should handle database errors', async () => {
            sql.connect.mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/products/1');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to fetch product');
        });
    });
}); 