require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");

const chatRoutes = require("./routes/chatRoutes");
const paystackRoutes = require("./routes/paystackRoutes");
const sessionMiddleware = require("./middleware/sessionMiddleware");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// session middleware attaches req.sessionDoc
app.use(sessionMiddleware);

// public UI
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/chat", chatRoutes);
app.use("/paystack", paystackRoutes);

// basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Server error" });
});

module.exports = app;
