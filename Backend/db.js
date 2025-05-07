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
    // Connection pool settings
    max: 10, // Maximum number of connections in the pool
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
    // Statement timeout settings
    statement_timeout: 30000, // 30 seconds in milliseconds
    query_timeout: 30000, // 30 seconds in milliseconds
});

module.exports = sql;