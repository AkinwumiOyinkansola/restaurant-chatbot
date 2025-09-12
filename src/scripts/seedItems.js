require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Item = require("../models/Item");

const items = [
  { name: "Jollof Rice", description: "Rice with tomato base", basePrice: 1200 },
  { name: "Fried Rice", description: "With veggies", basePrice: 1300 },
  { name: "Chicken Sandwich", description: "Grilled chicken sandwich", basePrice: 900 },
  { name: "Beef Burger", description: "Beef patty burger", basePrice: 1000 },
];

(async () => {
  await connectDB();
  await Item.deleteMany({});
  await Item.insertMany(items);
  console.log("Seeded items");
  process.exit(0);
})();
