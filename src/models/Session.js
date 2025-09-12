const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  name: String,
  price: Number,
  qty: { type: Number, default: 1 },
  option: { type: String, default: "" }, // option chosen
});

const orderSchema = new mongoose.Schema({
  items: [orderItemSchema],
  total: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
  paystackReference: String,
});

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  currentOrder: {
    items: [orderItemSchema],
    total: { type: Number, default: 0 },
  },
  orders: [orderSchema], // placed orders (history)
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Session", sessionSchema);
