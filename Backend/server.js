const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 8080;

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
