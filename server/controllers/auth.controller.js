const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const handlelogin = async (req, res) => {
    try{
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ message: 'Login successful' ,user: user ,token: token});
    }
    catch(err){
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}
const handlelogout = async (req, res) => {

    // Handle logout logic here, such as invalidating the token
    res.status(200).json({ message: 'Logout successful' });

}
const handleregister = async (req, res) => {
    try {
        const { username, password, email } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ message: 'Username, password, and email are required' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        const newUser = new User({ username, password, email });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports= { handlelogin, handlelogout, handleregister } 