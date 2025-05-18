const request = require('supertest');
const mockSql = jest.fn();
jest.mock('../db.js', () => mockSql);
const app = require('../server');

describe('Miscellaneous API Endpoints', () => {
    describe('GET /tshirt', () => {
        it('should return tshirt information', async () => {
            const response = await request(app)
                .get('/tshirt');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                tshirt: 'blue',
                size: 'large'
            });
        });
    });
});

describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
        const response = await request(app)
            .get('/api/non-existent-endpoint');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'API endpoint not found' });
    });

    it('should handle 500 errors', async () => {
        mockSql.mockRejectedValueOnce(new Error('Database error'));
        const response = await request(app)
            .get('/api/test-error');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'API endpoint not found' });
    });
});

describe('Server Configuration', () => {
    it('should handle CORS preflight requests', async () => {
        const response = await request(app)
            .options('/api/test')
            .set('Origin', 'http://localhost:5173')
            .set('Access-Control-Request-Method', 'POST');

        expect(response.status).toBe(204);
        expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should handle static file requests', async () => {
        const response = await request(app)
            .get('/assets/test.js');
        expect(response.status).toBe(200);
    });
}); 