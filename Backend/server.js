const express = require('express');
const app = express();
const sql = require('mssql');
const path = require('path');
const PORT = process.env.PORT || 8080;

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
