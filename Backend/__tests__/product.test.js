const request = require('supertest');
const mockSql = jest.fn();
jest.mock('../db.js', () => mockSql);
const app = require('../server');

// Mock console.error to suppress error messages during tests
console.error = jest.fn();

beforeEach(() => {
    mockSql.mockReset();
});

describe('Product API Endpoints', () => {
    const mockProduct = {
        seller_id: 'test-seller',
        title: 'Test Product',
        description: 'Test Description',
        price: '10.99', // Send as string to match form data
        stock: '100'    // Send as string to match form data
    };

    describe('POST /api/products', () => {
        it('should successfully create a new product', async () => {
            // Mock seller check
            mockSql.mockResolvedValueOnce([{}]); // Seller exists
            // Mock product insertion
            mockSql.mockResolvedValueOnce([
                {
                    ...mockProduct,
                    price: parseFloat(mockProduct.price),
                    stock: parseInt(mockProduct.stock, 10)
                }
            ]);

            const response = await request(app)
                .post('/api/products')
                .send(mockProduct);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'Product added successfully');
            expect(response.body).toHaveProperty('product');
            expect(mockSql).toHaveBeenCalledTimes(2);
        });

        it('should return 400 if seller does not exist', async () => {
            mockSql.mockResolvedValueOnce([]); // Seller does not exist

            const response = await request(app)
                .post('/api/products')
                .send(mockProduct);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Seller not found');
            expect(mockSql).toHaveBeenCalledTimes(1);
        });

        it('should return 400 if required fields are missing', async () => {
            const response = await request(app)
                .post('/api/products')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Missing required fields');
            expect(mockSql).not.toHaveBeenCalled();
        });

        it('should return 500 if there is a database error', async () => {
            mockSql.mockRejectedValueOnce(new Error('Database error'));
            const response = await request(app)
                .post('/api/products')
                .send({
                    seller_id: 'test-seller',
                    title: 'Test Product',
                    description: 'Test Description',
                    price: '10.99',
                    stock: '100'
                });
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to add product');
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

            mockSql.mockResolvedValueOnce(mockProducts);

            const response = await request(app)
                .get('/api/products');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('product_id', 1);
            expect(response.body[1]).toHaveProperty('product_id', 2);
        });

        it('should handle database errors', async () => {
            mockSql.mockRejectedValueOnce(new Error('Database connection failed'));

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

            mockSql.mockResolvedValueOnce([mockProduct]);

            const response = await request(app)
                .get('/api/products/1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('product_id', 1);
            expect(response.body).toHaveProperty('title', 'Product 1');
        });

        it('should return 404 if product not found', async () => {
            mockSql.mockResolvedValueOnce([]);

            const response = await request(app)
                .get('/api/products/999');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Product not found');
        });

        it('should handle database errors', async () => {
            mockSql.mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/products/1');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Failed to fetch product');
        });
    });

    describe('GET /api/products/seller/:shopName', () => {
        it('should return products for a given seller', async () => {
            mockSql.mockResolvedValueOnce([
                { product_id: 1, seller_id: 'seller1', title: 'Product 1', description: 'Desc', price: 10, stock: 5, image_url: '', shop_name: 'Shop1' }
            ]);
            const response = await request(app).get('/api/products/seller/Shop1');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
        it('should return 404 if no products found', async () => {
            mockSql.mockResolvedValueOnce([]);
            const response = await request(app).get('/api/products/seller/UnknownShop');
            expect(response.status).toBe(404);
        });
    });

    describe('PUT /api/products/:productId', () => {
        it('should update a product', async () => {
            mockSql.mockResolvedValueOnce([{ product_id: 1 }]); // Product exists
            mockSql.mockResolvedValueOnce([{ product_id: 1, title: 'Updated' }]); // Update result
            const response = await request(app)
                .put('/api/products/1')
                .send({ title: 'Updated', description: 'Desc', price: 20, stock: 10 });
            expect(response.status).toBe(200);
        });
    });
}); 