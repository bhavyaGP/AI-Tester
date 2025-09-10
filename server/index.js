const express = require('express');
//CRUD operation
const app = express();


app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World');
});
app.post('/data', (req, res) => {
    const data = req.body;
    res.send(data);
});
app.put('/data/:id', (req, res) => {
    const id = req.params.id;
    const data = req.body;
    res.send({ id, data });
});
app.delete('/data/:id', (req, res) => {
    const id = req.params.id;
    res.send({ id });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}   
);
module.exports = app;