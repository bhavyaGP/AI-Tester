const { getUser } = require('../services/auth.js');

async function checkAuth(req, res, next) {
    console.log("Checking auth");

    const token = req.cookies?.authToken;
    if (!token) {
        // console.log("No token");
        return res.redirect('/loggin');
    }
    const user = getUser(token);
    if (!user) {
        // console.log("No user");
        return res.redirect('/loggin');
    }
    console.log("User:", user);
    req.user = user;
    next();
}

module.exports = { checkAuth };