const sql = require('../db');
const postgres = require('postgres');

// Mock the postgres module
jest.mock('postgres', () => {
    return jest.fn().mockImplementation(() => {
        return jest.fn();
    });
});

describe('Database Configuration', () => {
    it('should create a postgres connection with correct configuration', () => {
        expect(postgres).toHaveBeenCalledWith({
            host: 'aws-0-eu-central-1.pooler.supabase.com',
            port: 6543,
            database: 'postgres',
            username: 'postgres.lyzdofwfiepznlcbxgxs',
            password: 'Indiecart123',
            ssl: {
                rejectUnauthorized: false
            },
            max: 10,
            idle_timeout: 20,
            connect_timeout: 10,
            statement_timeout: 30000,
            query_timeout: 30000
        });
    });

    it('should export the sql function', () => {
        expect(typeof sql).toBe('function');
    });

    it('should have the correct connection pool settings', () => {
        const config = postgres.mock.calls[0][0];
        expect(config.max).toBe(10);
        expect(config.idle_timeout).toBe(20);
        expect(config.connect_timeout).toBe(10);
    });

    it('should have the correct timeout settings', () => {
        const config = postgres.mock.calls[0][0];
        expect(config.statement_timeout).toBe(30000);
        expect(config.query_timeout).toBe(30000);
    });

    it('should have SSL configuration', () => {
        const config = postgres.mock.calls[0][0];
        expect(config.ssl).toEqual({
            rejectUnauthorized: false
        });
    });
}); 