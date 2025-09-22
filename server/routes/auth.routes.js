const express = require('express');
const Router = express.Router();
const { googleAuth } = require('../controller/auth.controller');

Router.get("/google", googleAuth);

module.exports = Router;