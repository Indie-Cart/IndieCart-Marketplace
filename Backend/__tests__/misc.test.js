const request = require('supertest');
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