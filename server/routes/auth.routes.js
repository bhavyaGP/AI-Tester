const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const { handlelogin, handlelogout, handleregister } = require('../controllers/auth.controller');

router.post('/login', handlelogin);

router.post('/register', handleregister);

router.get('/logout', handlelogout);

router.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;