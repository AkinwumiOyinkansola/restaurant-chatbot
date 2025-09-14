// models/Session.js
const mongoose = require("mongoose");

const ItemRefSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  name: String,
  qty: { type: Number, default: 1 },
  price: { type: Number, default: 0 }, // total price for this item (qty * unitPrice)
});

// Schema for a completed/past order
const OrderSchema = new mongoose.Schema({
  items: [ItemRefSchema],
  total: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

// Main Session schema
const SessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true, unique: true },

  state: { type: String, enum: ["main", "ordering"], default: "main" },

  // current active order (not yet checked out)
  currentOrder: {
    items: [ItemRefSchema],
    total: { type: Number, default: 0 },
  },

  // completed past orders
  orders: [OrderSchema],

  // ephemeral mapping: array of itemIds for numeric menu choices
  __menuMap: [{ type: String }],
});

module.exports = mongoose.model("Session", SessionSchema);
