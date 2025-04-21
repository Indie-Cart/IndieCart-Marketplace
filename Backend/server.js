const express = require('express');
const app = express();
const sql = require('mssql');
const path = require('path');
const multer = require('multer');
const PORT = process.env.PORT || 8080;

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbConfig = {
    user: 'sqlserveradmin',
    password: 'Indiecart123',
    server: 'indiecartserver2.database.windows.net',
    database: 'IndieCartdb2',
    options: {
      encrypt: true,
      enableArithAbort: true
    }
  };
  
  async function testDbConnection() {
    try {
      const pool = await sql.connect(dbConfig);
      const result = await pool.request().query('SELECT 1 AS result');
      console.log("✅ DB Connected! Result:", result.recordset);
      sql.close();
    } catch (err) {
      console.error("❌ DB Connection failed:", err.message);
      sql.close();
    }
  }
  testDbConnection();
  
// API endpoint to add new buyer
app.post('/api/buyers', async (req, res) => {
    try {
        const { buyer_id } = req.body;
        
        if (!buyer_id) {
            return res.status(400).json({ error: 'Buyer ID is required' });
        }

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('buyer_id', sql.VarChar, buyer_id)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM buyer WHERE buyer_id = @buyer_id)
                BEGIN
                    INSERT INTO buyer (buyer_id) VALUES (@buyer_id)
                END
            `);

        res.status(201).json({ message: 'Buyer added successfully' });
    } catch (err) {
        console.error('Error adding buyer:', err);
        res.status(500).json({ error: 'Failed to add buyer' });
    } finally {
        sql.close();
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

        const pool = await sql.connect(dbConfig);
        
        // First check if seller exists
        const sellerCheck = await pool.request()
            .input('seller_id', sql.VarChar, seller_id)
            .query('SELECT 1 FROM seller WHERE seller_id = @seller_id');

        if (sellerCheck.recordset.length === 0) {
            return res.status(400).json({ 
                error: 'Seller not found',
                message: 'Please register as a seller first before adding products'
            });
        }

        const result = await pool.request()
            .input('seller_id', sql.VarChar, seller_id)
            .input('title', sql.VarChar, title)
            .input('description', sql.VarChar, description)
            .input('price', sql.Decimal(18, 2), price)
            .input('stock', sql.Int, stock)
            .input('image', sql.VarBinary(sql.MAX), req.file ? req.file.buffer : null)
            .query(`
                INSERT INTO products (seller_id, title, description, price, stock, image)
                OUTPUT INSERTED.*
                VALUES (@seller_id, @title, @description, @price, @stock, @image)
            `);

        console.log('Product added successfully:', result.recordset[0]);
        res.status(201).json({ 
            message: 'Product added successfully',
            product: result.recordset[0]
        });
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ 
            error: 'Failed to add product',
            details: err.message 
        });
    } finally {
        sql.close();
    }
});

// API endpoint to get all products
app.get('/api/products', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query(`
                SELECT p.product_id, p.seller_id, p.title, p.description, p.price, p.stock, p.image, s.shop_name
                FROM products p
                LEFT JOIN seller s ON p.seller_id = s.seller_id
                ORDER BY p.product_id DESC
            `);

        // Convert binary image data to base64
        const productsWithImages = result.recordset.map(product => {
            if (product.image) {
                // Convert the binary buffer to base64
                const base64Image = Buffer.from(product.image).toString('base64');
                // Create a data URL that can be used in an img tag
                product.image = `data:image/jpeg;base64,${base64Image}`;
            }
            return product;
        });

        console.log('Retrieved products:', productsWithImages);
        res.json(productsWithImages);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    } finally {
        sql.close();
    }
});

// API endpoint to get a single product by ID
app.get('/api/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('productId', sql.Int, productId)
            .query(`
                SELECT p.*, s.shop_name
                FROM products p
                LEFT JOIN seller s ON p.seller_id = s.seller_id
                WHERE p.product_id = @productId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = result.recordset[0];
        if (product.image) {
            product.image = `data:image/jpeg;base64,${Buffer.from(product.image).toString('base64')}`;
        }

        res.json(product);
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    } finally {
        sql.close();
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

app.listen(PORT, () => {
    console.log(`It's alive on http://localhost:${PORT}`)
});
