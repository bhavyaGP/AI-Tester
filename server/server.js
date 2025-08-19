const express = require('express');
const app = express();
const db = []


app.get('/getdata', (req, res) => {
    res.json(db);
})
app.post('/postdata', (req, res) => {
    const newData = req.body;
    db.push(newData);
    res.json(newData);
})

app.delete('/deletedata/:id', (req, res) => {
    const { id } = req.params;
    db = db.filter(item => item.id !== id);
    res.status(204).json();
})
app.put('/updatedata/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    db = db.map(item => item.id === id ? updatedData : item);
    res.json(updatedData);
})

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

module.exports = app;