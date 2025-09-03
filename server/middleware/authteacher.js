const jwt = require('jsonwebtoken');
const { getUser } = require('../services/auth.js');

function authenticateTeacher(req, res, next) {
    // console.log('Authenticating teacher');
    try {
        const token = req.cookies?.authToken;
        // const token=req.headers.authorization.split(" ")[1];
        // console.log('Token:', token);

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

    
        const user = getUser(token);
        // console.log(user);

        if (user.role !== 'teacher') {
            return res.status(403).json({ error: 'Forbidden: Only teachers can access this route' });
        }

        req.teacherId = user.id;
        // console.log('Authenticated teacher:', req.teacherId);

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ error: 'Server error during authentication' });
    }
}






module.exports = { authenticateTeacher };
