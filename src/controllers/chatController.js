// src/controllers/chatController.js
const Item = require("../models/Item");
const Session = require("../models/Session");
const axios = require("axios");

/**
 * Helper - format currency consistently
 * @param {number} n
 * @returns {string}
 */
function formatMoney(n) {
  return `₦${Number(n).toFixed(2)}`;
}

/**
 * Helper - handle payment initialization
 */
async function initializePayment(orderIndex, sessionDoc, req) {
  try {
    const idx = orderIndex - 1;
    if (idx < 0 || idx >= sessionDoc.orders.length) {
      return { success: false, message: "Invalid order number." };
    }

    const order = sessionDoc.orders[idx];
    if (!order) {
      return { success: false, message: "Order not found." };
    }

    if (order.status === "paid") {
      return { success: false, message: "Order already paid." };
    }

    // Generate unique reference
    const reference = `${sessionDoc.userId}-${orderIndex}-${Date.now()}`;
    
    // Prepare payload for Paystack
    const payload = {
      amount: Math.round(order.total * 100), // Paystack expects kobo (Naira * 100)
      email: "customer@quickbites.com",
      reference: reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL || `${req.protocol}://${req.get('host')}/paystack/callback`,
      metadata: {
        orderIndex: orderIndex,
        userId: sessionDoc.userId
      }
    };

    // Call Paystack initialize API
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: { 
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
      }
    );

    // Store reference on the order
    order.paystackReference = reference;
    order.status = "pending";
    await sessionDoc.save();

    return {
      success: true,
      authorization_url: response.data.data.authorization_url,
      reference: reference,
      amount: order.total
    };

  } catch (error) {
    console.error('Payment initialization error:', error.response?.data || error.message);
    return { 
      success: false, 
      message: "Payment initialization failed. Please try again." 
    };
  }
}

/**
 * Chat handler (stateful)
 * Expects JSON: { userId: "user-123", message: "1" }
 * - If session middleware already set req.sessionDoc, it will be used.
 * - Otherwise this handler will findOrCreate a Session by userId.
 */
async function handleChat(req, res) {
  try {
    const rawMessage = (req.body.message || "").toString().trim();
    // prefer a sessionDoc already attached by middleware (if present)
    let sessionDoc = req.sessionDoc;

    // if middleware did not attach, try to find/create a session using userId from body
    if (!sessionDoc) {
      const userId = req.body.userId || `anon-${req.ip || "local"}-${Date.now()}`;
      sessionDoc = await Session.findOne({ userId });

      if (!sessionDoc) {
        sessionDoc = new Session({
          userId,
          state: "main", // default state
          currentOrder: { items: [], total: 0 },
          orders: [],
          __menuMap: [],
        });
        await sessionDoc.save();
      }
      // attach for downstream (optional)
      req.sessionDoc = sessionDoc;
    }

    // ensure common structures exist
    if (!sessionDoc.currentOrder) sessionDoc.currentOrder = { items: [], total: 0 };
    if (!Array.isArray(sessionDoc.orders)) sessionDoc.orders = [];
    if (!sessionDoc.state) sessionDoc.state = "main";
    if (!Array.isArray(sessionDoc.__menuMap)) sessionDoc.__menuMap = [];

    // small helper to persist session doc
    async function saveSession() {
      await sessionDoc.save();
    }

    // main menu text shown when user is in "main" or when they send empty message
    const mainMenuText = [
      "Welcome to QuickBites 🍔",
      "Select:",
      "1 - Place an order",
      "99 - Checkout (place current order)",
      "98 - Order history",
      "97 - Current order",
      "0 - Cancel current order",
      "(Reply with an item number when viewing items)",
    ].join("\n");

    // if no input -> show main menu
    if (!rawMessage) {
      return res.json({ reply: mainMenuText });
    }

    const msg = rawMessage.toLowerCase();

    // -----------------------
    // HANDLE PAYMENT COMMANDS FROM ANY STATE
    // -----------------------
    if (msg.startsWith("pay ")) {
      const parts = msg.split(/\s+/);
      const orderIndex = parseInt(parts[1], 10);
      
      if (Number.isNaN(orderIndex) || orderIndex < 1 || orderIndex > sessionDoc.orders.length) {
        return res.json({ reply: "❌ Invalid order number for payment." });
      }

      const paymentResult = await initializePayment(orderIndex, sessionDoc, req);
      
      if (paymentResult.success) {
        return res.json({
          type: "payment",
          reply: `💳 Payment ready for Order #${orderIndex} (${formatMoney(paymentResult.amount)})`,
          paymentUrl: paymentResult.authorization_url,
          reference: paymentResult.reference
        });
      } else {
        return res.json({ reply: `❌ ${paymentResult.message}` });
      }
    }

    // -----------------------
    // STATE: MAIN
    // -----------------------
    if (sessionDoc.state === "main") {
      // Show menu and enter ordering state
      if (msg === "1") {
        const items = await Item.find().sort({ name: 1 }); // sort for stable order
        if (!items || items.length === 0) {
          return res.json({ reply: "❌ No menu items available right now." });
        }

        // build menu lines with stable numbering (1-based)
        const lines = items.map((it, idx) => `${idx + 1} - ${it.name} - ${formatMoney(it.basePrice)}`);
        // create ephemeral mapping of numbers to item IDs and save in session
        sessionDoc.__menuMap = items.map((it) => it._id.toString());
        sessionDoc.state = "ordering";
        await saveSession();

        return res.json({
          reply: `📋 Menu:\n${lines.join("\n")}\n\nReply with the item number to add to your order.`,
        });
      }

      // View current order
      if (msg === "97") {
        const items = sessionDoc.currentOrder.items || [];
        if (items.length === 0) return res.json({ reply: "🛒 Your current order is empty." });

        const orderLines = items.map((it, i) => `${i + 1}. ${it.name} x${it.qty} - ${formatMoney(it.price)}`);
        return res.json({
          reply: `🛒 Current order:\n${orderLines.join("\n")}\nTotal: ${formatMoney(sessionDoc.currentOrder.total)}`,
        });
      }

      // Cancel current order
      if (msg === "0") {
        sessionDoc.currentOrder = { items: [], total: 0 };
        await saveSession();
        return res.json({ reply: "❌ Current order cancelled." });
      }

      // Checkout (place order)
      if (msg === "99") {
        const cur = sessionDoc.currentOrder;
        if (!cur || !cur.items || cur.items.length === 0) {
          return res.json({ reply: "🛒 No order to place." });
        }

        const newOrder = {
          items: cur.items.map((it) => ({ itemId: it.itemId, name: it.name, price: it.price, qty: it.qty })),
          total: cur.total,
          status: "pending",
          createdAt: new Date(),
        };

        sessionDoc.orders.push(newOrder);
        sessionDoc.currentOrder = { items: [], total: 0 };
        await saveSession();

        const orderIndex = sessionDoc.orders.length; // 1-based for user
        return res.json({
          reply: `✅ Order placed (Order #${orderIndex}). Reply 'pay ${orderIndex}' to pay now.`,
        });
      }

      // Order history
      if (msg === "98") {
        const hist = sessionDoc.orders || [];
        if (hist.length === 0) return res.json({ reply: "📜 No past orders yet." });

        const lines = hist.map((o, i) => {
          const statusEmoji = o.status === "paid" ? "✅" : o.status === "pending" ? "⏳" : "❓";
          return `${i + 1}. ${o.items.length} item(s) - ${formatMoney(o.total)} - ${statusEmoji} ${o.status}`;
        });
        return res.json({ reply: `📜 Order history:\n${lines.join("\n")}` });
      }

      // Default: show main menu text
      return res.json({ reply: mainMenuText });
    }

    // -----------------------
    // STATE: ORDERING (viewing menu)
    // -----------------------
    if (sessionDoc.state === "ordering") {
      // user replied numeric -> try add item
      if (/^\d+$/.test(msg)) {
        const idx = parseInt(msg, 10) - 1;
        if (!sessionDoc.__menuMap || idx < 0 || idx >= sessionDoc.__menuMap.length) {
          return res.json({ reply: "❌ Invalid item number." });
        }

        const itemId = sessionDoc.__menuMap[idx];
        const item = await Item.findById(itemId);
        if (!item) return res.json({ reply: "❌ Item not found." });

        // add or increment item in currentOrder
        const existing = sessionDoc.currentOrder.items.find((i) => i.itemId?.toString() === item._id.toString());
        if (existing) {
          existing.qty += 1;
          existing.price = item.basePrice * existing.qty;
        } else {
          sessionDoc.currentOrder.items.push({
            itemId: item._id,
            name: item.name,
            qty: 1,
            price: item.basePrice,
          });
        }

        // recalc total
        sessionDoc.currentOrder.total = sessionDoc.currentOrder.items.reduce((s, it) => s + (it.price || 0), 0);

        // reset to main after successful add
        sessionDoc.state = "main";
        sessionDoc.__menuMap = [];
        await saveSession();

        return res.json({
          reply: `${item.name} added to your order.\nCurrent total: ${formatMoney(sessionDoc.currentOrder.total)}\n\nBack to main menu:\n${mainMenuText}`,
        });
      }

      // allow user to type 'menu' or 'back' to return
      if (msg === "menu" || msg === "back") {
        sessionDoc.state = "main";
        sessionDoc.__menuMap = [];
        await saveSession();
        return res.json({ reply: `Back to main menu:\n${mainMenuText}` });
      }

      // else ask for valid number
      return res.json({ reply: "❌ Please reply with a valid item number from the menu (or 'back' to return)." });
    }

    // unknown state fallback
    sessionDoc.state = "main";
    await saveSession();
    return res.json({ reply: `⚠️ Session reset. ${mainMenuText}` });
  } catch (err) {
    console.error("Chat handler error:", err);
    return res.status(500).json({ reply: "⚠️ Server error. Please try again later." });
  }
}

module.exports = { handleChat };