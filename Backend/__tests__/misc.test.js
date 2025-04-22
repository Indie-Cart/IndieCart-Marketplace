const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../server');

// Mock the fs module
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockReturnValue(true),
    statSync: jest.fn().mockReturnValue({ isFile: () => true })
}));

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

    describe('Static file serving', () => {
        it('should handle static file requests', async () => {
            const response = await request(app)
                .get('/nonexistent-file.txt');

            // Since we're mocking fs.existsSync to return true,
            // express.static will try to serve the file
            expect(response.status).toBe(404);
        });

        it('should handle catch-all route', async () => {
            const response = await request(app)
                .get('/some-random-route');

            // The catch-all route will try to serve index.html
            expect(response.status).toBe(404);
        });
    });
}); 