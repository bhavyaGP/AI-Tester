const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const db = require('./connection');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const staticRoutes = require('./routes/static.routes');
const storestatisticRoutes = require('./routes/user.routes');
const doubtroutes = require('./routes/doubt.routes');
const chatRoutes = require('./routes/chat.routes');
const limitationRoutes = require('./routes/limitation.routes');
const testRoutes = require('./routes/test.routes');
const redis = require('./redis.connection');
const io = require('./socket.server');
const airoutes = require('./routes/ai.routes');
const maintenanceRoutes = require('./routes/maintenance');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');


const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ipv6Subnet: 56,
})
// app.use(limiter)
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', process.env.FRONTEND_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin']
}));

app.get('/', (req, res) => {
    res.send({ message: 'ok' });
});

app.use(morgan("[:date[clf]] :method :url :status :res[content-length] - :response-time ms"));
app.use('/auth', authRoutes);
app.use('/', staticRoutes);
app.use('/user', storestatisticRoutes);
app.use('/doubt', doubtroutes);
app.use('/chat', chatRoutes);
app.use('/api/limitation', limitationRoutes);
app.use('/test', testRoutes);
app.use('/gen', airoutes);
app.use('/maintenance', maintenanceRoutes);
app.listen(port, () => {
    console.log(`server is running on port http://localhost:${port}`);
});