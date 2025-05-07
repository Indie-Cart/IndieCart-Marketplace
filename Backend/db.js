const postgres = require('postgres');

const sql = postgres({
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    username: 'postgres.lyzdofwfiepznlcbxgxs',
    password: 'Indiecart123',
    ssl: {
        rejectUnauthorized: false
    },
    // Connection settings
    max: 1, // Use a single connection
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
    debug: process.env.NODE_ENV === 'development' // Enable debug logging in development
});

module.exports = sql; 