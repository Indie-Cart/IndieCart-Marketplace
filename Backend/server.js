const express = require('express');
const app = express();
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const PORT = process.env.PORT || 8080;

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to parse JSON and form data with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const pool = new Pool({
    user: 'postgres.pjmkexdjtqpnfqcbakwp',
    password: 'Indiecart123',
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: {
        rejectUnauthorized: false
    },
    // Session pooler settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 2000 // How long to wait for a connection to be established
});

async function testDbConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT 1 AS result');
        console.log("✅ DB Connected! Result:", result.rows);
        client.release();
    } catch (err) {
        console.error("❌ DB Connection failed:", err.message);
    }
}

// Only test DB connection when running the server directly
if (require.main === module) {
    testDbConnection();
}

// API endpoint to add new buyer
app.post('/api/buyers', async (req, res) => {
    try {
        const { buyer_id } = req.body;
        
        if (!buyer_id) {
            return res.status(400).json({ error: 'Buyer ID is required' });
        }

        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO buyer (buyer_id) VALUES ($1)',
            [buyer_id]
        );
        client.release();
        
        res.status(200).json({ message: 'Buyer added successfully' });
    } catch (error) {
        console.error('Error adding buyer:', error);
        res.status(500).json({ error: 'Failed to add buyer' });
    }
});

// API endpoint to add new product
app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        console.log('Adding new product - Request body:', req.body);
        console.log('Image file:', req.file);
        
        const { seller_id, title, description, price, stock } = req.body;
        
        if (!seller_id || !title || !description || !price || !stock) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                received: req.body
            });
        }

        const client = await pool.connect();
        
        // First check if seller exists
        const sellerCheck = await client.query(
            'SELECT 1 FROM seller WHERE seller_id = $1',
            [seller_id]
        );

        if (sellerCheck.rows.length === 0) {
            client.release();
            return res.status(400).json({ 
                error: 'Seller not found',
                message: 'Please register as a seller first before adding products'
            });
        }

        const result = await client.query(
            `INSERT INTO products (seller_id, title, description, price, stock, image)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [seller_id, title, description, price, stock, req.file ? req.file.buffer : null]
        );

        client.release();
        console.log('Product added successfully:', result.rows[0]);
        res.status(201).json({ 
            message: 'Product added successfully',
            product: result.rows[0]
        });
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ 
            error: 'Failed to add product',
            details: err.message 
        });
    }
});

// API endpoint to get all products
app.get('/api/products', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT p.product_id, p.seller_id, p.title, p.description, p.price, p.stock, p.image, s.shop_name
            FROM products p
            LEFT JOIN seller s ON p.seller_id = s.seller_id
            ORDER BY p.product_id DESC
        `);

        // Convert binary image data to base64
        const productsWithImages = result.rows.map(product => {
            if (product.image) {
                const base64Image = Buffer.from(product.image).toString('base64');
                product.image = `data:image/jpeg;base64,${base64Image}`;
            }
            return product;
        });

        client.release();
        console.log('Retrieved products:', productsWithImages);
        res.json(productsWithImages);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// API endpoint to get a single product by ID
app.get('/api/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const client = await pool.connect();
        const result = await client.query(`
            SELECT p.*, s.shop_name
            FROM products p
            LEFT JOIN seller s ON p.seller_id = s.seller_id
            WHERE p.product_id = $1
        `, [productId]);

        if (result.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = result.rows[0];
        if (product.image) {
            product.image = `data:image/jpeg;base64,${Buffer.from(product.image).toString('base64')}`;
        }

        client.release();
        res.json(product);
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// API endpoint to get products by seller name
app.get('/api/products/seller/:shopName', async (req, res) => {
    try {
        const { shopName } = req.params;
        const client = await pool.connect();
        const result = await client.query(`
            SELECT p.product_id, p.seller_id, p.title, p.description, p.price, p.stock, p.image, s.shop_name
            FROM products p
            LEFT JOIN seller s ON p.seller_id = s.seller_id
            WHERE s.shop_name = $1
            ORDER BY p.product_id DESC
        `, [shopName]);

        if (result.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'No products found for this seller' });
        }

        // Convert binary image data to base64
        const productsWithImages = result.rows.map(product => {
            if (product.image) {
                const base64Image = Buffer.from(product.image).toString('base64');
                product.image = `data:image/jpeg;base64,${base64Image}`;
            }
            return product;
        });

        client.release();
        res.json(productsWithImages);
    } catch (err) {
        console.error('Error fetching seller products:', err);
        res.status(500).json({ error: 'Failed to fetch seller products' });
    }
});

// API endpoint to add new seller
app.post('/api/sellers', async (req, res) => {
    try {
        const { seller_id, shop_name } = req.body;
        
        if (!seller_id || !shop_name) {
            return res.status(400).json({ error: 'Seller ID and shop name are required' });
        }

        const client = await pool.connect();
        
        // First check if seller already exists
        const sellerCheck = await client.query(
            'SELECT 1 FROM seller WHERE seller_id = $1',
            [seller_id]
        );

        if (sellerCheck.rows.length > 0) {
            client.release();
            return res.status(400).json({ error: 'You are already registered as a seller' });
        }

        await client.query(
            'INSERT INTO seller (seller_id, shop_name) VALUES ($1, $2)',
            [seller_id, shop_name]
        );
        
        client.release();
        res.status(201).json({ message: 'Successfully registered as a seller' });
    } catch (error) {
        console.error('Error adding seller:', error);
        res.status(500).json({ error: 'Failed to register as seller' });
    }
});

// API endpoint to check if user is a seller and get their products
app.get('/api/seller/check/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const client = await pool.connect();
        
        // Check if user is a seller
        const sellerCheck = await client.query(`
            SELECT s.seller_id, s.shop_name, 
                   (SELECT COUNT(*) FROM products p WHERE p.seller_id = s.seller_id) as product_count
            FROM seller s
            WHERE s.seller_id = $1
        `, [userId]);

        if (sellerCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ isSeller: false });
        }

        // Get seller's products
        const productsResult = await client.query(`
            SELECT p.product_id, p.title, p.description, p.price, p.stock, p.image
            FROM products p
            WHERE p.seller_id = $1
            ORDER BY p.product_id DESC
        `, [userId]);

        // Convert binary image data to base64
        const productsWithImages = productsResult.rows.map(product => {
            if (product.image) {
                product.image = `data:image/jpeg;base64,${Buffer.from(product.image).toString('base64')}`;
            }
            return product;
        });

        client.release();
        res.json({
            isSeller: true,
            sellerInfo: sellerCheck.rows[0],
            products: productsWithImages
        });
    } catch (error) {
        console.error('Error checking seller status:', error);
        res.status(500).json({ error: 'Failed to check seller status' });
    }
});

// API endpoint to update a product
app.put('/api/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { title, description, price, stock } = req.body;

        if (!title || !description || !price || !stock) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                received: req.body
            });
        }

        const client = await pool.connect();
        
        // First check if product exists
        const productCheck = await client.query(
            'SELECT 1 FROM products WHERE product_id = $1',
            [productId]
        );

        if (productCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Product not found' });
        }

        const result = await client.query(
            `UPDATE products 
             SET title = $1, description = $2, price = $3, stock = $4
             WHERE product_id = $5
             RETURNING *`,
            [title, description, price, stock, productId]
        );

        client.release();
        res.json({ 
            message: 'Product updated successfully',
            product: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ 
            error: 'Failed to update product',
            details: err.message 
        });
    }
});

//test api
app.get('/tshirt', (req, res) => {
    res.status(200).send({
        tshirt: 'blue',
        size: 'large'
    })
})

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
});

// Only start the server when running the file directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`It's alive on http://localhost:${PORT}`);
    });
}

module.exports = app;
