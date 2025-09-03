const mysql2 = require('mysql2');

// Create a MySQL connection using the mysql2 library
// const connection = mysql2.createConnection({
//     host: process.env.DB_HOST || 'localhost',  // Use environment variables for deployment
//     user: process.env.DB_USER || 'root',
//     password: process.env.DB_PASSWORD || 'Nilayptl@23',
//     database: process.env.DB_NAME || 'progressmatrix',
//     debug: false,
// });

const connection = mysql2.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: 'defaultdb' || 'mydb',
    debug: false,
    connectTimeout: 10000,
    port: 10566
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.stack);
        process.exit(1);  // Exit the process with a failure code if the connection fails
    } else {
        console.log('Connected to MySQL as ID', connection.threadId);
    }
});

// Handle connection errors after the initial connection
connection.on('error', (err) => {
    console.error('MySQL connection error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        // Reconnect if the connection is lost
        connection.connect((err) => {
            if (err) {
                console.error('Error reconnecting to MySQL:', err.stack);
                process.exit(1);
            } else {
                console.log('Reconnected to MySQL as ID', connection.threadId);
            }
        });
    } else {
        throw err;
    }
});

module.exports = connection;
