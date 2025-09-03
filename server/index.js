const express = require('express');
const cors = require('cors');
const app = express();

const {mongoose} = require('./db');

var port = 3000;

app.use(express.json());
app.use(cors());

// Routes
const studentRoutes = require('./routes/routes');
app.use('/api/students', studentRoutes);
// mount advanced grouped routes under /api/students/advanced
if (studentRoutes && studentRoutes.advanced) {
    app.use('/api/students/advanced', studentRoutes.advanced);
}



app.listen(port, () => {
    console.log(`Listen on ${port} port`);
});