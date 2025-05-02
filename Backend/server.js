const express = require('express');
const app = express();
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const PORT = process.env.PORT || 8080;

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Configure CORS
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:8080',
        'https://indiecart-dwgnhtdnh9fvashy.eastus-01.azurewebsites.net',
        'https://indiecart.vercel.app'
    ],
    credentials: true
}));

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

// Middleware to validate user ID
const validateUser = async (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'User ID is required' });
    }

    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT 1 FROM buyer WHERE buyer_id = $1',
            [userId]
        );
        client.release();

        if (result.rows.length === 0) {
            // Create buyer if they don't exist
            const client2 = await pool.connect();
            await client2.query(
                'INSERT INTO buyer (buyer_id) VALUES ($1)',
                [userId]
            );
            client2.release();
        }

        next();
    } catch (err) {
        console.error('Error validating user:', err);
        res.status(500).json({ error: 'Failed to validate user' });
    }
};

// Apply the validateUser middleware to cart routes
app.use('/api/cart', validateUser);

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

// API endpoint to delete a product
app.delete('/api/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const client = await pool.connect();

        // Start a transaction
        await client.query('BEGIN');

        try {
            // First check if product exists
            const productCheck = await client.query(
                'SELECT 1 FROM products WHERE product_id = $1',
                [productId]
            );

            if (productCheck.rows.length === 0) {
                throw new Error('Product not found');
            }

            // Delete from order_products first (due to foreign key constraint)
            await client.query(
                'DELETE FROM order_products WHERE product_id = $1',
                [productId]
            );

            // Then delete the product
            await client.query(
                'DELETE FROM products WHERE product_id = $1',
                [productId]
            );

            await client.query('COMMIT');
            res.json({ message: 'Product deleted successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({
            error: 'Failed to delete product',
            details: err.message
        });
    }
});

// API endpoint to add item to cart
app.post('/api/cart/add', async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const buyerId = req.headers['x-user-id'];

        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!productId || !quantity) {
            return res.status(400).json({ error: 'Product ID and quantity are required' });
        }

        const client = await pool.connect();

        // Start a transaction
        await client.query('BEGIN');

        try {
            // Check if product exists and has enough stock
            const productResult = await client.query(
                'SELECT stock FROM products WHERE product_id = $1',
                [productId]
            );

            if (productResult.rows.length === 0) {
                throw new Error('Product not found');
            }

            const currentStock = productResult.rows[0].stock;
            if (currentStock < quantity) {
                throw new Error('Not enough stock available');
            }

            // Check if buyer has an active cart
            let orderResult = await client.query(
                'SELECT order_id FROM "order" WHERE buyer_id = $1 AND status = $2',
                [buyerId, 'cart']
            );

            let orderId;

            if (orderResult.rows.length === 0) {
                // Create new cart order
                const newOrderResult = await client.query(
                    'INSERT INTO "order" (buyer_id, status) VALUES ($1, $2) RETURNING order_id',
                    [buyerId, 'cart']
                );
                orderId = newOrderResult.rows[0].order_id;
            } else {
                orderId = orderResult.rows[0].order_id;
            }

            // Check if product is already in cart
            const existingItemResult = await client.query(
                'SELECT quantity FROM order_products WHERE order_id = $1 AND product_id = $2',
                [orderId, productId]
            );

            if (existingItemResult.rows.length > 0) {
                // Update existing item quantity
                const newQuantity = existingItemResult.rows[0].quantity + quantity;
                if (newQuantity > currentStock) {
                    throw new Error('Not enough stock available for the total quantity');
                }

                await client.query(
                    'UPDATE order_products SET quantity = $1 WHERE order_id = $2 AND product_id = $3',
                    [newQuantity, orderId, productId]
                );
            } else {
                // Add new item to cart
                await client.query(
                    'INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)',
                    [orderId, productId, quantity]
                );
            }

            // Update product stock
            await client.query(
                'UPDATE products SET stock = stock - $1 WHERE product_id = $2',
                [quantity, productId]
            );

            await client.query('COMMIT');
            res.status(200).json({ message: 'Item added to cart successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error adding item to cart:', err);
        res.status(500).json({ error: err.message });
    }
});

// API endpoint to get cart items
app.get('/api/cart', async (req, res) => {
    try {
        const buyerId = req.headers['x-user-id'];

        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const client = await pool.connect();
        const result = await client.query(`
            SELECT 
                p.product_id,
                p.title,
                p.description,
                p.price,
                p.image,
                op.quantity,
                p.stock
            FROM "order" o
            JOIN order_products op ON o.order_id = op.order_id
            JOIN products p ON op.product_id = p.product_id
            WHERE o.buyer_id = $1 AND o.status = 'cart'
        `, [buyerId]);

        // Convert binary image data to base64
        const cartItems = result.rows.map(item => {
            if (item.image) {
                item.image = `data:image/jpeg;base64,${Buffer.from(item.image).toString('base64')}`;
            }
            return item;
        });

        client.release();
        res.json(cartItems);
    } catch (err) {
        console.error('Error fetching cart items:', err);
        res.status(500).json({ error: 'Failed to fetch cart items' });
    }
});

// API endpoint to update cart item quantity
app.put('/api/cart/update', async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const buyerId = req.headers['x-user-id'];

        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!productId || !quantity) {
            return res.status(400).json({ error: 'Product ID and quantity are required' });
        }

        const client = await pool.connect();

        // Start a transaction
        await client.query('BEGIN');

        try {
            // Get current cart item quantity and order_id
            const currentQuantityResult = await client.query(`
                SELECT op.quantity, p.stock, o.order_id
                FROM "order" o
                JOIN order_products op ON o.order_id = op.order_id
                JOIN products p ON op.product_id = p.product_id
                WHERE o.buyer_id = $1 AND o.status = 'cart' AND op.product_id = $2
            `, [buyerId, productId]);

            if (currentQuantityResult.rows.length === 0) {
                throw new Error('Item not found in cart');
            }

            const currentQuantity = currentQuantityResult.rows[0].quantity;
            const availableStock = currentQuantityResult.rows[0].stock + currentQuantity;
            const orderId = currentQuantityResult.rows[0].order_id;

            if (quantity > availableStock) {
                throw new Error('Not enough stock available');
            }

            if (quantity <= 0) {
                // Remove item from cart if quantity is 0 or negative
                await client.query(`
                    DELETE FROM order_products
                    WHERE order_id = $1 AND product_id = $2
                `, [orderId, productId]);

                // Check if cart is empty
                const remainingItems = await client.query(
                    'SELECT COUNT(*) FROM order_products WHERE order_id = $1',
                    [orderId]
                );

                if (remainingItems.rows[0].count === '0') {
                    // Delete the empty order
                    await client.query(
                        'DELETE FROM "order" WHERE order_id = $1',
                        [orderId]
                    );
                }
            } else {
                // Update cart item quantity
                await client.query(`
                    UPDATE order_products
                    SET quantity = $1
                    WHERE order_id = $2 AND product_id = $3
                `, [quantity, orderId, productId]);
            }

            // Update product stock
            const stockDifference = currentQuantity - quantity;
            await client.query(
                'UPDATE products SET stock = stock + $1 WHERE product_id = $2',
                [stockDifference, productId]
            );

            await client.query('COMMIT');
            res.status(200).json({ message: 'Cart item updated successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error updating cart item:', err);
        res.status(500).json({ error: err.message });
    }
});

// API endpoint to remove item from cart
app.delete('/api/cart/remove', async (req, res) => {
    try {
        const { productId } = req.body;
        const buyerId = req.headers['x-user-id'];

        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        const client = await pool.connect();

        // Start a transaction
        await client.query('BEGIN');

        try {
            // Get current cart item quantity and order_id
            const quantityResult = await client.query(`
                SELECT op.quantity, o.order_id
                FROM "order" o
                JOIN order_products op ON o.order_id = op.order_id
                WHERE o.buyer_id = $1 AND o.status = 'cart' AND op.product_id = $2
            `, [buyerId, productId]);

            if (quantityResult.rows.length === 0) {
                throw new Error('Item not found in cart');
            }

            const quantity = quantityResult.rows[0].quantity;
            const orderId = quantityResult.rows[0].order_id;

            // Remove item from cart
            await client.query(`
                DELETE FROM order_products
                WHERE order_id = $1 AND product_id = $2
            `, [orderId, productId]);

            // Check if cart is empty
            const remainingItems = await client.query(
                'SELECT COUNT(*) FROM order_products WHERE order_id = $1',
                [orderId]
            );

            if (remainingItems.rows[0].count === '0') {
                // Delete the empty order
                await client.query(
                    'DELETE FROM "order" WHERE order_id = $1',
                    [orderId]
                );
            }

            // Update product stock
            await client.query(
                'UPDATE products SET stock = stock + $1 WHERE product_id = $2',
                [quantity, productId]
            );

            await client.query('COMMIT');
            res.status(200).json({ message: 'Item removed from cart successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error removing item from cart:', err);
        res.status(500).json({ error: err.message });
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

// API endpoint to update buyer shipping details
app.put('/api/buyers/update', async (req, res) => {
    try {
        const buyerId = req.headers['x-user-id'];
        const { shipping_address, suburb, city, province, postal_code, name, number } = req.body;

        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const client = await pool.connect();
        const result = await client.query(
            `UPDATE buyer 
             SET shipping_address = $1, 
                 suburb = $2, 
                 city = $3, 
                 province = $4, 
                 postal_code = $5, 
                 name = $6, 
                 number = $7
             WHERE buyer_id = $8`,
            [shipping_address, suburb, city, province, postal_code, name, number, buyerId]
        );
        client.release();

        res.status(200).json({ message: 'Shipping details updated successfully' });
    } catch (error) {
        console.error('Error updating shipping details:', error);
        res.status(500).json({ error: 'Failed to update shipping details' });
    }
});

// API endpoint to get buyer shipping details
app.get('/api/buyers/details', async (req, res) => {
    try {
        const buyerId = req.headers['x-user-id'];

        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const client = await pool.connect();
        const result = await client.query(
            `SELECT shipping_address, suburb, city, province, postal_code, name, number
             FROM buyer 
             WHERE buyer_id = $1`,
            [buyerId]
        );
        client.release();

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Buyer not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching buyer details:', error);
        res.status(500).json({ error: 'Failed to fetch buyer details' });
    }
});

// Only start the server when running the file directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`It's alive on http://localhost:${PORT}`);
    });
}

module.exports = app;
