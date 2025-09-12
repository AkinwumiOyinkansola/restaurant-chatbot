const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true },   // e.g., "Small", "Large", "Add chicken"
  price: { type: Number, required: true },
});

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  basePrice: { type: Number, required: true },
  options: [optionSchema], // optional variants
});

module.exports = mongoose.model("Item", itemSchema);
