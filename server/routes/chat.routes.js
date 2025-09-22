const express = require("express");
const Chat = require("../models/chat.model");
const Doubt = require("../models/doubt.model");
const router = express.Router();
const { joinchat, getChatHistory, sendMessage } = require("../controller/chat.controller");
const io = require("../socket.server");
// User joins the chat

// **📌 User joins the chat room**
router.post("/join", joinchat);

// **📌 Send a chat message**
router.post("/send", sendMessage);

// **📌 Fetch chat history**
router.get("/history/:doubtId", getChatHistory);


module.exports = router;
