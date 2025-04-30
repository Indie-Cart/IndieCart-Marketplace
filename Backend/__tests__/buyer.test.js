const request = require('supertest');
const sql = require('mssql');

// Mock console.error to suppress error messages in tests
const originalConsoleError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalConsoleError;
});

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
        request: jest.fn().mockReturnValue(mockRequest)
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
            const mockResult = { recordset: [{ buyer_id: mockBuyerId }] };

            const mockPool = await sql.connect();
            const mockRequest = mockPool.request();
            mockRequest.query.mockResolvedValueOnce(mockResult);

            const response = await request(app)
                .post('/api/buyers')
                .send({ buyer_id: mockBuyerId });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: 'Buyer added successfully' });
            expect(sql.connect).toHaveBeenCalledWith({
                user: 'sqlserveradmin',
                password: 'Indiecart123',
                server: 'indiecartserverus.database.windows.net',
                database: 'IndieCartdb2_Copy',
                options: {
                    encrypt: true,
                    enableArithAbort: true
                }
            });
            expect(mockRequest.input).toHaveBeenCalledWith('buyer_id', sql.VarChar, mockBuyerId);
            expect(mockRequest.query).toHaveBeenCalledWith('INSERT INTO buyer (buyer_id) VALUES (@buyer_id)');
        });

        it('should handle database errors', async () => {
            sql.connect.mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await request(app)
                .post('/api/buyers')
                .send({ buyer_id: 'test-buyer-123' });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to add buyer' });
        });
    });
}); 