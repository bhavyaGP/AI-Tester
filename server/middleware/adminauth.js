const jwt = require('jsonwebtoken');
const { getUser } = require('../services/auth.js');

function restrictedtoadminonly(req, res, next) {
    console.log('Authenticating admin...');
    try {
        // Check for auth token in cookies
        const token = req.cookies?.authToken;
        // console.log('Token:', token);
        
        if (!token) {
            console.warn('No token provided, redirecting to login');
            return res.redirect('/login');
        }

        // Decode and verify token
        const user = getUser(token);
        // console.log('User:', user);
// 
        // Check if the user has an admin role
        if (!user || user.role !== 'admin') {
            console.warn('User is not admin or token is invalid:', user);
            return res.status(403).json({ error: 'Forbidden: Only admin can access this route' });
        }

        // Set admin ID for further use in request
        req.adminID = user.id;
        console.log('Authenticated admin:', req.adminID);

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please log in again.' });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ error: 'Invalid token. Please log in again.' });
        }

        return res.status(500).json({ error: 'Server error during authentication' });
    }
}


module.exports = { restrictedtoadminonly };
