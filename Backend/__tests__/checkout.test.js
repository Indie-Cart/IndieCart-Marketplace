const request = require('supertest');
const app = require('../server');
const stripe = require('stripe');

// Mock console.error to suppress error messages during tests
console.error = jest.fn();

// Mock stripe
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                create: jest.fn().mockResolvedValue({
                    url: 'https://checkout.stripe.com/test'
                })
            }
        },
        webhooks: {
            constructEvent: jest.fn().mockImplementation((payload, sig, secret) => {
                if (sig === 'test-signature') {
                    return {
                        type: 'checkout.session.completed',
                        data: {
                            object: {
                                metadata: {
                                    buyerId: 'test-buyer-id'
                                }
                            }
                        }
                    };
                }
                throw new Error('Invalid signature');
            })
        }
    }));
});

describe('Checkout API Endpoints', () => {
    const mockBuyerId = 'test-buyer-id';
    const mockAmount = 1000; // $10.00 in cents

    describe('POST /api/checkout', () => {
        it('should create a checkout session successfully', async () => {
            const response = await request(app)
                .post('/api/checkout')
                .set('x-user-id', mockBuyerId)
                .send({ amount: mockAmount });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                redirectUrl: 'https://checkout.stripe.com/test'
            });
        });

        it('should return 401 if user is not authenticated', async () => {
            const response = await request(app)
                .post('/api/checkout')
                .send({ amount: mockAmount });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'User not authenticated' });
        });
    });

    describe('POST /api/webhook', () => {
        it('should handle successful payment webhook', async () => {
            const response = await request(app)
                .post('/api/webhook')
                .set('stripe-signature', 'test-signature')
                .send({ type: 'checkout.session.completed' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ received: true });
        });

        it('should handle invalid webhook signature', async () => {
            const response = await request(app)
                .post('/api/webhook')
                .set('stripe-signature', 'invalid-signature')
                .send({ type: 'checkout.session.completed' });

            expect(response.status).toBe(400);
            expect(response.text).toContain('Webhook Error: Invalid signature');
        });
    });
}); 