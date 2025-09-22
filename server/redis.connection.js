const { createClient } = require('redis');

const client = createClient({
    username: 'default',
    password: 'SigZwVP96Md0M8Cv4l31DHT564X0wy4K',
    socket: {
        host: 'redis-19292.c13.us-east-1-3.ec2.redns.redis-cloud.com',
        port: 19292
    }
});

client.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

async function connectRedis() {
    if (!client.isOpen) {
        await client.connect();
        console.log('✅Connected to Redis Cloud');
    }
}

connectRedis();

module.exports = client;


// const Redis = require("ioredis");

// const redis = new Redis({
//     host: "localhost",  // Redis is running on localhost (inside Docker)
//     port: 6379,         // Default Redis port
// });

// redis.on("connect", () => console.log("✅ Connected to Redis"));
// redis.on("error", (err) => console.error("❌ Redis Connection Error:", err));

// module.exports=redis;