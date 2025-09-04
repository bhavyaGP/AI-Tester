const express = require('express');
const cors = require('cors');
const app = express();

const {mongoose} = require('./db');

var port = 3000;

app.use(express.json());
app.use(cors());

// Routes
app.use('/api/students', require('./routes/routes'));



app.listen(port, () => {
    console.log(`Listen on ${port} port`);
});