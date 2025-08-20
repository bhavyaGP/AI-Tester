const express = require('express');
const app = express();
app.use(express.json()); // Needed to parse JSON bodies

let db = []; // Use 'let' instead of 'const' since you're reassigning it

// GET all data
app.get('/getdata', (req, res) => {
    res.status(200).json(db);
});

// POST new data
app.post('/postdata', (req, res) => {
    const newData = req.body;
    db.push(newData);
    res.status(201).json(newData); // 201 Created
});

// DELETE data by ID
app.delete('/deletedata/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = db.length;
    db = db.filter(item => item.id !== id);

    if (db.length === initialLength) {
        return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json({ message: 'Item deleted successfully' });
});

// PUT update data by ID
app.put('/updatedata/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    let found = false;

    db = db.map(item => {
        if (item.id === id) {
            found = true;
            return updatedData;
        }
        return item;
    });

   if(!found) {
       return res.status(404).json({ message: 'Item not found' });
   }

    res.status(200).json(updatedData);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

module.exports = app;