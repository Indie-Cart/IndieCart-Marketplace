const express = require('express');
const app = express();
const sql = require('mssql');
const path = require('path');
const PORT = process.env.PORT || 8080;

// Middleware to parse JSON bodies
app.use(express.json());

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
