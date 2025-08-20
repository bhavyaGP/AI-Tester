const express = require('express');
const app = express();
app.use(express.json());

let db = [];

app.get('/getdata', (req, res) => {
    res.json(db);
});

// POST new data
app.post('/postdata', (req, res) => {
    const newData = req.body;
    db.push(newData);
    res.json(newData);
});

// DELETE data by ID
app.delete('/deletedata/:id', (req, res) => {
    const { id } = req.params;
    db = db.filter(item => item.id !== id);
    res.json({ message: 'Deleted' });
});

// PUT update data by ID
app.put('/updatedata/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    db = db.map(item => item.id === id ? updatedData : item);
    res.json(updatedData);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

module.exports = app;