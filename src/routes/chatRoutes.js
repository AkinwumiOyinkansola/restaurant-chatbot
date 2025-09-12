const express = require("express");
const router = express.Router();
const { handleChat } = require("../controllers/chatController");

// single POST endpoint that accepts { message: "<text>" }
router.post("/", handleChat);

module.exports = router;
