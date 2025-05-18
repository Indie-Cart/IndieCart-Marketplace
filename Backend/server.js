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
        console.log("âœ… DB Connected! Result:", result);
    } catch (err) {
        console.error("âŒ DB Connection failed:", err.message);
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

// Middleware to check if user is an admin
const isAdmin = async (req, res, next) => {
    const adminId = req.headers['x-user-id'];

    if (!adminId) {
        return res.status(401).json({ error: 'Admin ID is required' });
    }

    try {
        const result = await sql`SELECT 1 FROM admin WHERE admin_id = ${adminId}`;

        if (result.length === 0) {
            return res.status(403).json({ error: 'User is not authorized as an admin' });
        }

        next();
    } catch (err) {
        console.error('Error checking admin status:', err);
        res.status(500).json({ error: 'Failed to check admin status' });
    }
};

// Apply the validateUser middleware to cart routes
app.use('/api/cart', validateUser);

// Apply isAdmin middleware to all admin routes
app.use('/api/admin', isAdmin);

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
app.post('/api/products', async (req, res) => {
    try {
        console.log('Adding new product - Request body:', req.body);

        const { seller_id, title, description, price, stock, image_url } = req.body;

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
            INSERT INTO products (seller_id, title, description, price, stock, image_url)
            VALUES (${seller_id}, ${title}, ${description}, ${parsedPrice}, ${parsedStock}, ${image_url})
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
            SELECT p.product_id, p.seller_id, p.title, p.description, p.price, p.stock, p.image_url, s.shop_name
            FROM products p
            LEFT JOIN seller s ON p.seller_id = s.seller_id
            ORDER BY p.product_id DESC
        `;

        res.json(products);
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

        res.json(result[0]);
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
            SELECT p.product_id, p.seller_id, p.title, p.description, p.price, p.stock, p.image_url, s.shop_name
            FROM products p
            LEFT JOIN seller s ON p.seller_id = s.seller_id
            WHERE s.shop_name = ${shopName}
            ORDER BY p.product_id DESC`;

        if (result.length === 0) {
            return res.status(404).json({ error: 'No products found for this seller' });
        }

        res.json(result);
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
            SELECT p.product_id, p.title, p.description, p.price, p.stock, p.image_url
            FROM products p
            WHERE p.seller_id = ${userId}
            ORDER BY p.product_id DESC`;

        res.json({
            isSeller: true,
            sellerInfo: result[0],
            products: productsResult
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

        await sql.begin(async (sql) => {
            // First check if product exists
            const productCheck = await sql`SELECT 1 FROM products WHERE product_id = ${productId}`;

            if (productCheck.length === 0) {
                throw new Error('Product not found');
            }

            // Delete from order_products first (due to foreign key constraint)
            await sql`DELETE FROM order_products WHERE product_id = ${productId}`;

            // Then delete the product
            await sql`DELETE FROM products WHERE product_id = ${productId}`;
        });

        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Error deleting product:', err);
        if (err.message === 'Product not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({
            error: 'Failed to delete product',
            details: err.message
        });
    }
});
// API endpoint to get all 'paid' orders with products from a specific seller
app.get('/api/seller/orders-to-ship/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        // Get all paid orders that have products from this seller
        const orders = await sql`
            SELECT DISTINCT o.order_id, o.buyer_id, o.status
            FROM "order" o
            JOIN order_products op ON o.order_id = op.order_id
            JOIN products p ON op.product_id = p.product_id
            WHERE p.seller_id = ${sellerId} AND o.status = 'paid'
            ORDER BY o.order_id DESC
        `;

        // For each order, get the products from this seller
        const ordersWithProducts = [];
        for (const order of orders) {
            const products = await sql`
                SELECT p.product_id, p.title, p.description, p.price, p.image_url, op.quantity
                FROM order_products op
                JOIN products p ON op.product_id = p.product_id
                WHERE op.order_id = ${order.order_id} AND p.seller_id = ${sellerId}
            `;
            ordersWithProducts.push({
                ...order,
                products
            });
        }

        res.json(ordersWithProducts);
    } catch (error) {
        console.error('Error fetching seller orders to ship:', error);
        res.status(500).json({ error: 'Failed to fetch orders to ship' });
    }
});

// API endpoint for seller to mark an order as shipped
app.put('/api/seller/mark-shipped/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        // Only update if the order is currently 'paid'
        const result = await sql`
            UPDATE "order"
            SET status = 'shipping'
            WHERE order_id = ${orderId} AND status = 'paid'
            RETURNING *
        `;
        if (result.length === 0) {
            return res.status(404).json({ error: 'Order not found or not in paid status' });
        }
        res.json({ message: 'Order marked as shipping', order: result[0] });
    } catch (error) {
        console.error('Error marking order as shipped:', error);
        res.status(500).json({ error: 'Failed to mark order as shipped' });
    }
});

// API endpoint to get all 'shipping' orders with products from a specific seller
app.get('/api/seller/orders-shipping/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        // Get all shipping orders that have products from this seller
        const orders = await sql`
            SELECT DISTINCT o.order_id, o.buyer_id, o.status
            FROM "order" o
            JOIN order_products op ON o.order_id = op.order_id
            JOIN products p ON op.product_id = p.product_id
            WHERE p.seller_id = ${sellerId} AND o.status = 'shipping'
            ORDER BY o.order_id DESC
        `;

        // For each order, get the products from this seller
        const ordersWithProducts = [];
        for (const order of orders) {
            const products = await sql`
                SELECT p.product_id, p.title, p.description, p.price, p.image_url, op.quantity
                FROM order_products op
                JOIN products p ON op.product_id = p.product_id
                WHERE op.order_id = ${order.order_id} AND p.seller_id = ${sellerId}
            `;
            ordersWithProducts.push({
                ...order,
                products
            });
        }

        res.json(ordersWithProducts);
    } catch (error) {
        console.error('Error fetching seller shipping orders:', error);
        res.status(500).json({ error: 'Failed to fetch shipping orders' });
    }
});

// Get products to ship for a seller
app.get('/api/seller/products-to-ship/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const products = await sql`
      SELECT op.id, op.order_id, op.product_id, op.quantity, op.status, p.title,
        b.shipping_address, b.city, b.suburb, b.province, b.postal_code, b.name, b.number
      FROM order_products op
      JOIN products p ON op.product_id = p.product_id
      JOIN "order" o ON op.order_id = o.order_id
      JOIN buyer b ON o.buyer_id = b.buyer_id
      WHERE p.seller_id = ${sellerId} AND op.status = 'pending' AND o.status = 'paid'
      ORDER BY op.order_id DESC
    `;
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products to ship' });
    }
});

// Get products being shipped for a seller
app.get('/api/seller/products-shipping/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const products = await sql`
      SELECT op.id, op.order_id, op.product_id, op.quantity, op.status, p.title,
        b.shipping_address, b.city, b.suburb, b.province, b.postal_code, b.name, b.number
      FROM order_products op
      JOIN products p ON op.product_id = p.product_id
      JOIN "order" o ON op.order_id = o.order_id
      JOIN buyer b ON o.buyer_id = b.buyer_id
      WHERE p.seller_id = ${sellerId} AND op.status = 'shipping' AND o.status = 'paid'
      ORDER BY op.order_id DESC
    `;
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products being shipped' });
    }
});

// Mark a product as shipped
app.put('/api/seller/mark-product-shipped/:orderProductId', async (req, res) => {
    try {
        const { orderProductId } = req.params;
        const result = await sql`
      UPDATE order_products
      SET status = 'shipping'
      WHERE id = ${orderProductId} AND status = 'pending'
      RETURNING *
    `;
        if (result.length === 0) {
            return res.status(404).json({ error: 'Order product not found or not pending' });
        }
        res.json({ message: 'Product marked as shipping', orderProduct: result[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark product as shipped' });
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

        await sql.begin(async (sql) => {
            // Check if product exists and has enough stock
            const productResult = await sql`SELECT stock FROM products WHERE product_id = ${productId}`;

            if (productResult.length === 0) {
                throw new Error('Product not found');
            }

            const currentStock = productResult[0].stock;
            if (currentStock < quantity) {
                throw new Error('Not enough stock available');
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
                    throw new Error('Not enough stock available for the total quantity');
                }

                await sql`UPDATE order_products SET quantity = ${newQuantity} WHERE order_id = ${orderId} AND product_id = ${productId}`;
            } else {
                // Add new item to cart
                await sql`INSERT INTO order_products (order_id, product_id, quantity) VALUES (${orderId}, ${productId}, ${quantity})`;
            }

            // Update product stock
            await sql`UPDATE products SET stock = stock - ${quantity} WHERE product_id = ${productId}`;
        });

        res.status(200).json({ message: 'Item added to cart successfully' });
    } catch (err) {
        console.error('Error adding item to cart:', err);
        if (err.message === 'Product not found') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Not enough stock available' || err.message === 'Not enough stock available for the total quantity') {
            return res.status(400).json({ error: err.message });
        }
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
                p.image_url,
                op.quantity,
                p.stock
            FROM "order" o
            JOIN order_products op ON o.order_id = op.order_id
            JOIN products p ON op.product_id = p.product_id
            WHERE o.buyer_id = ${buyerId} AND o.status = 'cart'`;

        res.json(result);
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

        await sql.begin(async (sql) => {
            // Get current cart item quantity and order_id
            const currentQuantityResult = await sql`
                SELECT op.quantity, p.stock, o.order_id
                FROM "order" o
                JOIN order_products op ON o.order_id = op.order_id
                JOIN products p ON op.product_id = p.product_id
                WHERE o.buyer_id = ${buyerId} AND o.status = 'cart' AND op.product_id = ${productId}`;

            if (currentQuantityResult.length === 0) {
                throw new Error('Item not found in cart');
            }

            const currentQuantity = currentQuantityResult[0].quantity;
            const availableStock = currentQuantityResult[0].stock + currentQuantity;
            const orderId = currentQuantityResult[0].order_id;

            if (quantity > availableStock) {
                throw new Error('Not enough stock available');
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
        });

        res.status(200).json({ message: 'Cart item updated successfully' });
    } catch (err) {
        console.error('Error updating cart item:', err);
        if (err.message === 'Item not found in cart') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Not enough stock available') {
            return res.status(400).json({ error: err.message });
        }
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

        await sql.begin(async (sql) => {
            // Get current cart item quantity and order_id
            const quantityResult = await sql`
                SELECT op.quantity, o.order_id
                FROM "order" o
                JOIN order_products op ON o.order_id = op.order_id
                WHERE o.buyer_id = ${buyerId} AND o.status = 'cart' AND op.product_id = ${productId}`;

            if (quantityResult.length === 0) {
                throw new Error('Item not found in cart');
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
        });

        res.status(200).json({ message: 'Item removed from cart successfully' });
    } catch (err) {
        console.error('Error removing item from cart:', err);
        if (err.message === 'Item not found in cart') {
            return res.status(400).json({ error: err.message });
        }
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

// API endpoint to mark order as paid after successful payment
app.post('/api/payment/success', async (req, res) => {
    try {
        const buyerId = req.headers['x-user-id'];
        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Start a transaction
        await sql.begin(async (sql) => {
            // Get the cart order for this buyer
            const cartOrder = await sql`
                SELECT order_id 
                FROM "order" 
                WHERE buyer_id = ${buyerId} AND status = 'cart'
            `;

            if (cartOrder.length === 0) {
                throw new Error('No cart order found');
            }

            // Update the order status to paid
            await sql`
                UPDATE "order" 
                SET status = 'paid' 
                WHERE order_id = ${cartOrder[0].order_id}
            `;
        });

        res.status(200).json({ message: 'Order marked as paid' });
    } catch (err) {
        console.error('Error updating order status on payment success:', err);
        if (err.message === 'No cart order found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to update order status' });
    }
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

// API endpoint to get all orders for a buyer, including product status
app.get('/api/buyer/orders', async (req, res) => {
    try {
        const buyerId = req.headers['x-user-id'];
        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Get all orders for this buyer that still have items and are not cart
        const orders = await sql`
            SELECT DISTINCT o.order_id, o.status, o.buyer_id
            FROM "order" o
            JOIN order_products op ON o.order_id = op.order_id
            WHERE o.buyer_id = ${buyerId} AND o.status != 'cart'
            ORDER BY o.order_id DESC
        `;
        // For each order, get the products and their status
        const ordersWithItems = [];
        for (const order of orders) {
            const items = await sql`
                SELECT op.id, op.product_id, op.quantity, op.status as product_status, p.title, p.price, p.image_url
                FROM order_products op
                JOIN products p ON op.product_id = p.product_id
                WHERE op.order_id = ${order.order_id}
            `;
            // Calculate total amount for the order
            let total_amount = 0;
            items.forEach(item => {
                total_amount += Number(item.price) * Number(item.quantity);
            });
            ordersWithItems.push({
                ...order,
                total_amount,
                items
            });
        }
        res.json(ordersWithItems);
    } catch (error) {
        console.error('Error fetching buyer orders:', error);
        res.status(500).json({ error: 'Failed to fetch buyer orders' });
    }
});

// API endpoint for buyer to mark an order as received (shipping -> shipped)
app.put('/api/buyer/mark-received/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const buyerId = req.headers['x-user-id'];

        if (!buyerId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Only update if the order belongs to this buyer and is currently 'shipping'
        const result = await sql`
            UPDATE "order"
            SET status = 'shipped'
            WHERE order_id = ${orderId} 
            AND buyer_id = ${buyerId} 
            AND status = 'shipping'
            RETURNING *
        `;

        if (result.length === 0) {
            return res.status(404).json({ error: 'Order not found, not in shipping status, or does not belong to buyer' });
        }

        res.json({ message: 'Order marked as shipped', order: result[0] });
    } catch (error) {
        console.error('Error marking order as shipped:', error);
        res.status(500).json({ error: 'Failed to mark order as shipped' });
    }
});

// API endpoint for buyer to mark a product as received (shipping -> shipped)
app.put('/api/buyer/mark-product-received/:orderProductId', async (req, res) => {
    try {
        const { orderProductId } = req.params;
        const buyerId = req.headers['x-user-id'];

        const result = await sql`
            UPDATE order_products
            SET status = 'shipped'
            WHERE id = ${orderProductId} AND status = 'shipping'
            RETURNING *
        `;
        if (result.length === 0) {
            return res.status(404).json({ error: 'Order product not found or not in shipping status' });
        }
        res.json({ message: 'Product marked as shipped', orderProduct: result[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark product as shipped' });
    }
});

// Get products shipped (fulfilled) for a seller
app.get('/api/seller/products-shipped/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const products = await sql`
      SELECT op.id, op.order_id, op.product_id, op.quantity, op.status, p.title,
        b.shipping_address, b.city, b.suburb, b.province, b.postal_code, b.name, b.number
      FROM order_products op
      JOIN products p ON op.product_id = p.product_id
      JOIN "order" o ON op.order_id = o.order_id
      JOIN buyer b ON o.buyer_id = b.buyer_id
      WHERE p.seller_id = ${sellerId} AND op.status = 'shipped' AND o.status = 'paid'
      ORDER BY op.order_id DESC
    `;
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch shipped products' });
    }
});

// --- Seller Reports Endpoints ---

// Sales Trends: aggregate by order (only fulfilled products), show total quantity and revenue per order
app.get('/api/seller/reports/sales-trends/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const result = await sql`
      SELECT o.order_id, SUM(op.quantity) AS total_quantity, SUM(op.quantity * p.price) AS total_revenue
      FROM order_products op
      JOIN products p ON op.product_id = p.product_id
      JOIN "order" o ON op.order_id = o.order_id
      WHERE p.seller_id = ${sellerId} AND o.status = 'paid' AND op.status = 'shipped'
      GROUP BY o.order_id
      ORDER BY o.order_id DESC
    `;
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sales trends' });
    }
});

// Inventory Status: all products for the seller
app.get('/api/seller/reports/inventory/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const result = await sql`
      SELECT product_id, title, price, stock
      FROM products
      WHERE seller_id = ${sellerId}
      ORDER BY title
    `;
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory status' });
    }
});

// Custom View: join order_products, products, order, buyer, filter by status
app.get('/api/seller/reports/custom/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { status } = req.query;
        const result = await sql`
      SELECT op.id, o.order_id, op.product_id, op.quantity, op.status AS order_product_status, p.title, p.price, b.name, b.shipping_address, b.city, b.suburb, b.province, b.postal_code, b.number
      FROM order_products op
      JOIN products p ON op.product_id = p.product_id
      JOIN "order" o ON op.order_id = o.order_id
      JOIN buyer b ON o.buyer_id = b.buyer_id
      WHERE p.seller_id = ${sellerId}
      ${status ? sql`AND op.status = ${status}` : sql``}
      ORDER BY o.order_id DESC
    `;
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch custom report' });
    }
});

// --- Admin Endpoints ---

// API endpoint to check if user is an admin
app.get('/api/admin/check', (req, res) => {
    // If this endpoint is reached, the isAdmin middleware has already verified the user
    res.status(200).json({ isAdmin: true });
});

// API endpoint to get all sellers (Admin only)
app.get('/api/admin/sellers', async (req, res) => {
    try {
        const sellers = await sql`SELECT seller_id, shop_name FROM seller`;
        res.json(sellers);
    } catch (err) {
        console.error('Error fetching sellers for admin:', err);
        res.status(500).json({ error: 'Failed to fetch sellers' });
    }
});

// API endpoint to delete a seller (Admin only)
app.delete('/api/admin/sellers/:sellerId', isAdmin, async (req, res) => {
    try {
        const { sellerId } = req.params;

        await sql.begin(async (sql) => {
            // Find product IDs for the seller
            const productIds = await sql`SELECT product_id FROM products WHERE seller_id = ${sellerId}`;
            const idsToDelete = productIds.map(row => row.product_id);

            // Use WHERE IN only if there are products to delete
            if (idsToDelete.length > 0) {
                // Delete entries in order_products that reference these products, ONLY if the order status is 'cart' or 'shipped'
                await sql`
                    DELETE FROM order_products op
                    USING "order" o
                    WHERE op.product_id IN (SELECT * FROM unnest(${idsToDelete}::int[]))
                      AND op.order_id = o.order_id
                      AND o.status IN ('cart', 'shipped')
                `;

                // Delete products associated with the seller
                await sql`DELETE FROM products WHERE seller_id = ${sellerId}`;
            }

            // Delete the seller
            const result = await sql`DELETE FROM seller WHERE seller_id = ${sellerId} RETURNING *`;

            if (result.length === 0) {
                // If the seller wasn't found, rollback the transaction
                // Throw a specific error that can be caught below to send a 404
                throw new Error('Seller not found');
            }
        });

        res.json({ message: 'Seller deleted successfully' });
    } catch (err) {
        console.error('Error deleting seller:', err);
        // Check for the specific 'Seller not found' error to return 404
        if (err.message === 'Seller not found') {
            return res.status(404).json({ error: err.message });
        }
        // For any other error, return 500
        res.status(500).json({ error: 'Failed to delete seller' });
    }
});

// API endpoint to get all products for a seller (Admin only)
app.get('/api/admin/sellers/:sellerId/products', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const products = await sql`SELECT product_id, title, description, price, stock, image_url FROM products WHERE seller_id = ${sellerId}`;
        res.json(products);
    } catch (err) {
        console.error('Error fetching seller products for admin:', err);
        res.status(500).json({ error: 'Failed to fetch seller products' });
    }
});

// API endpoint to edit a product (Admin only)
app.put('/api/admin/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { title, description, price, stock, image_url } = req.body;

        const result = await sql`
            UPDATE products
            SET
                title = COALESCE(${title}, title),
                description = COALESCE(${description}, description),
                price = COALESCE(${price}, price),
                stock = COALESCE(${stock}, stock),
                image_url = COALESCE(${image_url}, image_url)
            WHERE product_id = ${productId}
            RETURNING *`;

        if (result.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product updated successfully', product: result[0] });
    } catch (err) {
        console.error('Error editing product:', err);
        res.status(500).json({ error: 'Failed to edit product' });
    }
});

// API endpoint to delete a product (Admin only)
app.delete('/api/admin/products/:productId', isAdmin, async (req, res) => {
    try {
        const { productId } = req.params;

        await sql.begin(async (sql) => {
            // First check if product exists
            const productCheck = await sql`SELECT 1 FROM products WHERE product_id = ${productId}`;

            if (productCheck.length === 0) {
                throw new Error('Product not found');
            }

            // Get all order IDs that have this product
            const orderIds = await sql`
                SELECT DISTINCT order_id 
                FROM order_products 
                WHERE product_id = ${productId}
            `;

            // Delete entries in order_products that reference this product
            await sql`
                DELETE FROM order_products
                WHERE product_id = ${productId}
            `;

            // Delete the product
            await sql`DELETE FROM products WHERE product_id = ${productId}`;

            // For each affected order, check if it's now empty and delete if it is
            for (const { order_id } of orderIds) {
                const remainingItems = await sql`
                    SELECT COUNT(*) as count 
                    FROM order_products 
                    WHERE order_id = ${order_id}
                `;

                if (remainingItems[0].count === '0') {
                    await sql`DELETE FROM "order" WHERE order_id = ${order_id}`;
                }
            }
        });

        res.json({ message: 'Product and associated empty orders deleted successfully' });
    } catch (err) {
        console.error('Error deleting product:', err);
        console.error('Full error details:', JSON.stringify(err, null, 2));

        if (err.message === 'Product not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// --- Admin Endpoints End ---

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
