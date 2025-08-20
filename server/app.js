require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors')
dotenv.config();
const app = express();

//allow cors for localhost 5173 port
const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));

//morgan for logging requests
const morgan = require('morgan');
app.use(morgan('dev'));

const port = process.env.PORT || 3000;
const db = require('./connection');

app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth.routes');
const levelRoutes = require('./routes/level.routes');
const llmRoutes = require('./routes/llm.routes');
const aiRoutes = require('./routes/ai.routes');
const taskRoutes = require('./routes/task.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const storeRoutes = require('./routes/store.routes');
const statsRoutes = require('./routes/stats.routes');
const shopRoutes = require('./routes/shop.routes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/llm', llmRoutes);



// app.use('/api/ai', aiRoutes); //optional
// // app.use('/api/tasks', taskRoutes);
// app.use('/api/inventory', inventoryRoutes); //optional
// app.use('/api/store', storeRoutes);  //optional
// app.use('/api/stats', statsRoutes);
// app.use('/api/shop', shopRoutes); //optional


app.get('/', (req, res) => {
  res.json('yes sirr 🫡🫡');
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

module.exports = app;

