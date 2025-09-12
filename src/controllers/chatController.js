const Item = require("../models/Item");
const Session = require("../models/Session");
const axios = require("axios");

function formatMoney(n) {
  return `₦${Number(n).toFixed(2)}`;
}

async function handleChat(req, res) {
  // get the message from client (string)
  const raw = (req.body.message || "").trim();
  const sessionDoc = req.sessionDoc; // from middleware

  // helper to save session doc after modification
  async function saveSession() {
    await sessionDoc.save();
  }

  // initial menu
  const mainMenu = `
Welcome to QuickBites 🍔
Select:
1 - Place an order
99 - Checkout (place current order)
98 - Order history
97 - Current order
0 - Cancel current order
(Reply with an item number when viewing items)
  `.trim();

  // empty -> show menu
  if (!raw) {
    return res.json({ reply: mainMenu });
  }

  // normalize message
  const msg = raw.toLowerCase();

  // 1 => list items
  if (msg === "1") {
    const items = await Item.find();
    if (!items || items.length === 0) {
      return res.json({ reply: "No menu items available right now." });
    }

    // build numbered list, remember: client should send the number to add item
    const lines = items.map((it, idx) => {
      const number = idx + 1;
      return `${number} - ${it.name} - ${formatMoney(it.basePrice)}`;
    });

    // store a lightweight mapping in session so the server will know which number maps to which item id
    // (we'll attach an ephemeral map inside the session doc under __menuMap)
    sessionDoc.__menuMap = items.map((it) => it._id.toString());
    await saveSession();

    return res.json({ reply: `Menu:\n${lines.join("\n")}\n\nReply with the item number to add to your order.` });
  }

  // If message is numeric and we have a stored menu map, try add item
  if (/^\d+$/.test(msg) && sessionDoc.__menuMap && sessionDoc.__menuMap.length > 0) {
    const idx = parseInt(msg, 10) - 1;
    if (idx < 0 || idx >= sessionDoc.__menuMap.length) {
      return res.json({ reply: "Invalid item number. Please choose a valid item." });
    }

    const itemId = sessionDoc.__menuMap[idx];
    const item = await Item.findById(itemId);
    if (!item) return res.json({ reply: "Selected item not found." });

    // add to currentOrder (or increase qty if exists)
    const existing = sessionDoc.currentOrder.items.find((i) => i.itemId.toString() === item._id.toString());
    if (existing) {
      existing.qty += 1;
      existing.price = item.basePrice * existing.qty;
    } else {
      sessionDoc.currentOrder.items.push({
        itemId: item._id,
        name: item.name,
        price: item.basePrice,
        qty: 1,
      });
    }

    // recalc total
    sessionDoc.currentOrder.total = sessionDoc.currentOrder.items.reduce((s, it) => s + (it.price || 0), 0);
    await saveSession();

    return res.json({ reply: `Added ${item.name} to your cart. Current total: ${formatMoney(sessionDoc.currentOrder.total)}.\nReply 1 to add more items, 99 to checkout, 97 to view current order.` });
  }

  // 97 -> view current order
  if (msg === "97") {
    const items = sessionDoc.currentOrder.items || [];
    if (items.length === 0) return res.json({ reply: "Your current order is empty." });

    const lines = items.map((it, idx) => `${idx + 1}. ${it.name} x${it.qty} - ${formatMoney(it.price)}`);
    return res.json({ reply: `Current Order:\n${lines.join("\n")}\nTotal: ${formatMoney(sessionDoc.currentOrder.total)}\nReply 99 to place order.` });
  }

  // 0 -> cancel current order
  if (msg === "0") {
    sessionDoc.currentOrder = { items: [], total: 0 };
    await saveSession();
    return res.json({ reply: "Current order cancelled." });
  }

  // 99 -> checkout / place order
  if (msg === "99") {
    const current = sessionDoc.currentOrder;
    if (!current || !current.items || current.items.length === 0) {
      return res.json({ reply: "No order to place." });
    }

    // move current to orders
    const newOrder = {
      items: current.items.map((it) => ({ ...it.toObject ? it.toObject() : it })),
      total: current.total,
      status: "pending",
      createdAt: new Date(),
    };

    sessionDoc.orders.push(newOrder);
    // clear current order
    sessionDoc.currentOrder = { items: [], total: 0 };
    await saveSession();

    // reply: order placed + option to pay
    const orderIndex = sessionDoc.orders.length; // 1-based index for user
    return res.json({
      reply: `Order placed (Order #${orderIndex}). Reply 'pay ${orderIndex}' to pay now using Paystack, or reply 1 to place a new order.`,
    });
  }

  // pay {index} => initialize paystack and return auth url
  if (msg.startsWith("pay ")) {
    const parts = msg.split(" ");
    const idx = parseInt(parts[1], 10) - 1;
    if (Number.isNaN(idx) || idx < 0 || idx >= sessionDoc.orders.length) {
      return res.json({ reply: "Invalid order number for payment." });
    }
    const order = sessionDoc.orders[idx];
    if (!order) return res.json({ reply: "Order not found." });
    if (order.status === "paid") return res.json({ reply: "Order already paid." });

    // initialize with Paystack (server side) 
    //  we'll return a simple response instructing the UI to call /paystack/init
    return res.json({
      reply: `To pay for Order #${idx + 1} of ${formatMoney(order.total)}, open the link: POST /paystack/init with { orderIndex: ${idx + 1} }`,
    });
  }

  // 98 -> order history
  if (msg === "98") {
    const orders = sessionDoc.orders || [];
    if (orders.length === 0) return res.json({ reply: "You have no past orders." });

    const lines = orders.map((o, i) => {
      return `${i + 1}. ${o.items.length} item(s) - ${formatMoney(o.total)} - ${o.status}`;
    });

    return res.json({ reply: `Order History:\n${lines.join("\n")}` });
  }

  // fallback
  return res.json({ reply: "Sorry, I didn't understand that. Reply with the main menu number (1, 99, 98, 97, 0) or an item number." });
}

module.exports = { handleChat };
