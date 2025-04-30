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

describe('Buyer API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/buyers', () => {
        it('should return 400 if buyer_id is missing', async () => {
            const response = await request(app)
                .post('/api/buyers')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Buyer ID is required' });
        });

        it('should successfully create a new buyer', async () => {
            const mockBuyerId = 'test-buyer-123';
            const mockResult = { rows: [{ buyer_id: mockBuyerId }] };

            const mockClient = {
                query: jest.fn().mockResolvedValueOnce(mockResult),
                release: jest.fn()
            };
            const mockPool = new Pool();
            mockPool.connect.mockResolvedValueOnce(mockClient);

            const response = await request(app)
                .post('/api/buyers')
                .send({ buyer_id: mockBuyerId });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: 'Buyer added successfully' });
            expect(mockClient.query).toHaveBeenCalledWith(
                'INSERT INTO buyer (buyer_id) VALUES ($1)',
                [mockBuyerId]
            );
        });

        it('should handle database errors', async () => {
            const mockPool = new Pool();
            mockPool.connect.mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await request(app)
                .post('/api/buyers')
                .send({ buyer_id: 'test-buyer-123' });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to add buyer' });
        });
    });
}); 