const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const PORT = process.env.PORT || 8080;
const stripe = require('stripe')('sk_test_51RKJnzCSe9LtgDWXmINjc7FwgUSuhRR9rD1dNsUs85urygKhT8TaTjx1pHBHBmHEgROiYmPP0fX811lYgClN5TaW00vuKBReu5');
const sql = require('./db.js');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Configure CORS
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:8080',
        'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net',
        'https://indiecart.vercel.app'
    ],
    credentials: true
}));

// Middleware to parse JSON and form data with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Test database connection
async function testDbConnection() {
    try {
        const result = await sql`SELECT 1 AS result`;
        console.log("✅ DB Connected! Result:", result);
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
        const result = await sql`SELECT 1 FROM buyer WHERE buyer_id = ${userId}`;

        if (result.length === 0) {
            // Create buyer if they don't exist
            await sql`INSERT INTO buyer (buyer_id) VALUES (${userId})`;
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

        await sql`INSERT INTO buyer (buyer_id) VALUES (${buyer_id})`;

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

        // First check if seller exists
        const sellerCheck = await sql`SELECT 1 FROM seller WHERE seller_id = ${seller_id}`;

        if (sellerCheck.length === 0) {
            return res.status(400).json({
                error: 'Seller not found',
                message: 'Please register as a seller first before adding products'
            });
        }

        // Parse price and stock as numbers
        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock, 10);

        const result = await sql`
            INSERT INTO products (seller_id, title, description, price, stock, image)
            VALUES (${seller_id}, ${title}, ${description}, ${parsedPrice}, ${parsedStock}, ${req.file ? req.file.buffer : null})
            RETURNING *`;

        console.log('Product added successfully:', result);
        res.status(201).json({
            message: 'Product added successfully',
            product: result
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
        const products = await sql`
            SELECT p.product_id, p.seller_id, p.title, p.description, p.price, p.stock, p.image, s.shop_name
            FROM products p
            LEFT JOIN seller s ON p.seller_id = s.seller_id
            ORDER BY p.product_id DESC
        `;

        // Convert binary image data to base64
        const productsWithImages = products.map(product => {
            if (product.image) {
                const base64Image = Buffer.from(product.image).toString('base64');
                product.image = `data:image/jpeg;base64,${base64Image}`;
            }
            return product;
        });

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
        const result = await sql`
            SELECT p.*, s.shop_name
            FROM products p
            LEFT JOIN seller s ON p.seller_id = s.seller_id
            WHERE p.product_id = ${productId}`;

        if (result.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = result[0];
        if (product.image) {
            product.image = `data:image/jpeg;base64,${Buffer.from(product.image).toString('base64')}`;
        }

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
        const result = await sql`
            SELECT p.product_id, p.seller_id, p.title, p.description, p.price, p.stock, p.image, s.shop_name
            FROM products p
            LEFT JOIN seller s ON p.seller_id = s.seller_id
            WHERE s.shop_name = ${shopName}
            ORDER BY p.product_id DESC`;

        if (result.length === 0) {
            return res.status(404).json({ error: 'No products found for this seller' });
        }

        // Convert binary image data to base64
        const productsWithImages = result.map(product => {
            if (product.image) {
                const base64Image = Buffer.from(product.image).toString('base64');
                product.image = `data:image/jpeg;base64,${base64Image}`;
            }
            return product;
        });

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

        // First check if seller already exists
        const sellerCheck = await sql`SELECT 1 FROM seller WHERE seller_id = ${seller_id}`;

        if (sellerCheck.length > 0) {
            return res.status(400).json({ error: 'You are already registered as a seller' });
        }

        await sql`INSERT INTO seller (seller_id, shop_name) VALUES (${seller_id}, ${shop_name})`;

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
        const result = await sql`
            SELECT s.seller_id, s.shop_name, 
                   (SELECT COUNT(*) FROM products p WHERE p.seller_id = s.seller_id) as product_count
            FROM seller s
            WHERE s.seller_id = ${userId}`;

        if (result.length === 0) {
            return res.status(404).json({ isSeller: false });
        }

        // Get seller's products
        const productsResult = await sql`
            SELECT p.product_id, p.title, p.description, p.price, p.stock, p.image
            FROM products p
            WHERE p.seller_id = ${userId}
            ORDER BY p.product_id DESC`;

        // Convert binary image data to base64
        const productsWithImages = productsResult.map(product => {
            if (product.image) {
                product.image = `data:image/jpeg;base64,${Buffer.from(product.image).toString('base64')}`;
            }
            return product;
        });

        res.json({
            isSeller: true,
            sellerInfo: result[0],
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

        const result = await sql`
            UPDATE products 
            SET title = ${title}, description = ${description}, price = ${price}, stock = ${stock}
            WHERE product_id = ${productId}
            RETURNING *`;

        res.json({
            message: 'Product updated successfully',
            product: result
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
        await sql`BEGIN`;

        try {
            // First check if product exists
            const productCheck = await sql`SELECT 1 FROM products WHERE product_id = ${productId}`;

            if (productCheck.length === 0) {
                throw new Error('Product not found');
            }

            // Delete from order_products first (due to foreign key constraint)
            await sql`DELETE FROM order_products WHERE product_id = ${productId}`;

            // Then delete the product
            await sql`DELETE FROM products WHERE product_id = ${productId}`;

            await sql`COMMIT`;
            res.json({ message: 'Product deleted successfully' });
        } catch (err) {
            await sql`ROLLBACK`;
            throw err;
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

        await sql`BEGIN`;

        try {
            // Check if product exists and has enough stock
            const productResult = await sql`SELECT stock FROM products WHERE product_id = ${productId}`;

            if (productResult.length === 0) {
                await sql`ROLLBACK`;
                return res.status(400).json({ error: 'Product not found' });
            }

            const currentStock = productResult[0].stock;
            if (currentStock < quantity) {
                await sql`ROLLBACK`;
                return res.status(400).json({ error: 'Not enough stock available' });
            }

            // Check if buyer has an active cart
            let orderResult = await sql`SELECT order_id FROM "order" WHERE buyer_id = ${buyerId} AND status = 'cart'`;

            let orderId;

            if (orderResult.length === 0) {
                // Create new cart order
                const newOrderResult = await sql`INSERT INTO "order" (buyer_id, status) VALUES (${buyerId}, 'cart') RETURNING order_id`;
                orderId = newOrderResult[0].order_id;
            } else {
                orderId = orderResult[0].order_id;
            }

            // Check if product is already in cart
            const existingItemResult = await sql`SELECT quantity FROM order_products WHERE order_id = ${orderId} AND product_id = ${productId}`;

            if (existingItemResult.length > 0) {
                // Update existing item quantity
                const newQuantity = existingItemResult[0].quantity + quantity;
                if (newQuantity > currentStock) {
                    await sql`ROLLBACK`;
                    return res.status(400).json({ error: 'Not enough stock available for the total quantity' });
                }

                await sql`UPDATE order_products SET quantity = ${newQuantity} WHERE order_id = ${orderId} AND product_id = ${productId}`;
            } else {
                // Add new item to cart
                await sql`INSERT INTO order_products (order_id, product_id, quantity) VALUES (${orderId}, ${productId}, ${quantity})`;
            }

            // Update product stock
            await sql`UPDATE products SET stock = stock - ${quantity} WHERE product_id = ${productId}`;

            await sql`COMMIT`;
            res.status(200).json({ message: 'Item added to cart successfully' });
        } catch (err) {
            await sql`ROLLBACK`;
            throw err;
        }
    } catch (err) {
        console.error('Error adding item to cart:', err);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// API endpoint to get cart items
app.get('/api/cart', async (req, res) => {
    try {
        const buyerId = req.headers['x-user-id'];

        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const result = await sql`
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
            WHERE o.buyer_id = ${buyerId} AND o.status = 'cart'`;

        // Convert binary image data to base64
        const cartItems = result.map(item => {
            if (item.image) {
                item.image = `data:image/jpeg;base64,${Buffer.from(item.image).toString('base64')}`;
            }
            return item;
        });

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

        await sql`BEGIN`;

        try {
            // Get current cart item quantity and order_id
            const currentQuantityResult = await sql`
                SELECT op.quantity, p.stock, o.order_id
                FROM "order" o
                JOIN order_products op ON o.order_id = op.order_id
                JOIN products p ON op.product_id = p.product_id
                WHERE o.buyer_id = ${buyerId} AND o.status = 'cart' AND op.product_id = ${productId}`;

            if (currentQuantityResult.length === 0) {
                await sql`ROLLBACK`;
                return res.status(400).json({ error: 'Item not found in cart' });
            }

            const currentQuantity = currentQuantityResult[0].quantity;
            const availableStock = currentQuantityResult[0].stock + currentQuantity;
            const orderId = currentQuantityResult[0].order_id;

            if (quantity > availableStock) {
                await sql`ROLLBACK`;
                return res.status(400).json({ error: 'Not enough stock available' });
            }

            if (quantity <= 0) {
                // Remove item from cart if quantity is 0 or negative
                await sql`DELETE FROM order_products WHERE order_id = ${orderId} AND product_id = ${productId}`;

                // Check if cart is empty
                const remainingItems = await sql`SELECT COUNT(*) FROM order_products WHERE order_id = ${orderId}`;

                if (remainingItems[0].count === '0') {
                    // Delete the empty order
                    await sql`DELETE FROM "order" WHERE order_id = ${orderId}`;
                }
            } else {
                // Update cart item quantity
                await sql`UPDATE order_products SET quantity = ${quantity} WHERE order_id = ${orderId} AND product_id = ${productId}`;
            }

            // Update product stock
            const stockDifference = currentQuantity - quantity;
            await sql`UPDATE products SET stock = stock + ${stockDifference} WHERE product_id = ${productId}`;

            await sql`COMMIT`;
            res.status(200).json({ message: 'Cart item updated successfully' });
        } catch (err) {
            await sql`ROLLBACK`;
            throw err;
        }
    } catch (err) {
        console.error('Error updating cart item:', err);
        res.status(500).json({ error: 'Failed to update cart item' });
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

        await sql`BEGIN`;

        try {
            // Get current cart item quantity and order_id
            const quantityResult = await sql`
                SELECT op.quantity, o.order_id
                FROM "order" o
                JOIN order_products op ON o.order_id = op.order_id
                WHERE o.buyer_id = ${buyerId} AND o.status = 'cart' AND op.product_id = ${productId}`;

            if (quantityResult.length === 0) {
                await sql`ROLLBACK`;
                return res.status(400).json({ error: 'Item not found in cart' });
            }

            const quantity = quantityResult[0].quantity;
            const orderId = quantityResult[0].order_id;

            // Remove item from cart
            await sql`DELETE FROM order_products WHERE order_id = ${orderId} AND product_id = ${productId}`;

            // Check if cart is empty
            const remainingItems = await sql`SELECT COUNT(*) FROM order_products WHERE order_id = ${orderId}`;

            if (remainingItems[0].count === '0') {
                // Delete the empty order
                await sql`DELETE FROM "order" WHERE order_id = ${orderId}`;
            }

            // Update product stock
            await sql`UPDATE products SET stock = stock + ${quantity} WHERE product_id = ${productId}`;

            await sql`COMMIT`;
            res.status(200).json({ message: 'Item removed from cart successfully' });
        } catch (err) {
            await sql`ROLLBACK`;
            throw err;
        }
    } catch (err) {
        console.error('Error removing item from cart:', err);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});

// API endpoint to create Stripe checkout session
app.post('/api/checkout', async (req, res) => {
    try {
        const buyerId = req.headers['x-user-id'];
        const { amount } = req.body;

        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'zar',
                        product_data: {
                            name: 'IndieCart Order',
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}/?payment=success`,
            cancel_url: `${req.headers.origin}/cart`,
            metadata: {
                buyerId: buyerId
            }
        });

        res.json({ redirectUrl: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Webhook endpoint to handle successful payments
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, 'your_webhook_secret');
    } catch (err) {
        console.error('Webhook Error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const buyerId = session.metadata.buyerId;

        try {
            await sql`UPDATE "order" SET status = 'paid' WHERE buyer_id = ${buyerId} AND status = 'cart'`;
        } catch (error) {
            console.error('Error updating order status:', error);
            return res.status(500).json({ error: 'Failed to update order status' });
        }
    }

    res.json({ received: true });
});

//test api
app.get('/tshirt', (req, res) => {
    res.status(200).send({
        tshirt: 'blue',
        size: 'large'
    })
})


// API endpoint to update buyer shipping details
app.put('/api/buyers/update', async (req, res) => {
    try {
        const buyerId = req.headers['x-user-id'];
        const { shipping_address, suburb, city, province, postal_code, name, number } = req.body;

        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        await sql`
            UPDATE buyer 
            SET shipping_address = ${shipping_address}, 
                suburb = ${suburb}, 
                city = ${city}, 
                province = ${province}, 
                postal_code = ${postal_code}, 
                name = ${name}, 
                number = ${number}
            WHERE buyer_id = ${buyerId}`;

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

        const result = await sql`
            SELECT shipping_address, suburb, city, province, postal_code, name, number
            FROM buyer 
            WHERE buyer_id = ${buyerId}`;

        if (result.length === 0) {
            return res.status(404).json({ error: 'Buyer not found' });
        }

        res.json(result[0]);
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

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    // Don't handle API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

module.exports = app;
