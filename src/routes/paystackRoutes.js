const express = require("express");
const axios = require("axios");
const router = express.Router();
const Session = require("../models/Session");

// initialize a Paystack transaction for an order
router.post("/init", async (req, res, next) => {
  try {
    const { orderIndex } = req.body;
    const sessionDoc = req.sessionDoc;
    const idx = parseInt(orderIndex, 10) - 1;
    if (!sessionDoc || !sessionDoc.orders || !sessionDoc.orders[idx]) {
      return res.status(400).json({ message: "Order not found" });
    }
    const order = sessionDoc.orders[idx];
    if (order.status === "paid") return res.status(400).json({ message: "Already paid" });

    // prepare payload
    const payload = {
      amount: Math.round(order.total * 100), // paystack expects kobo (Naira * 100)
      email: "no-reply@example.com", // no-auth app, use placeholder or ask for email
      reference: `${sessionDoc.sessionId}-${Date.now()}`,
      callback_url: process.env.PAYSTACK_CALLBACK_URL,
    };

    // call paystack initialize
    const resp = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    // store reference on order
    order.paystackReference = payload.reference;
    await sessionDoc.save();

    return res.json({ authorization_url: resp.data.data.authorization_url });
  } catch (err) {
    next(err);
  }
});

// verify endpoint: Paystack will redirect back to your callback route with a `reference` in query
// we'll also expose a verify endpoint for frontend polling
router.get("/verify", async (req, res, next) => {
  try {
    const reference = req.query.reference;
    const sessionId = req.cookies.sessionId;
    if (!reference || !sessionId) return res.status(400).json({ message: "Missing reference or session" });

    const sessionDoc = await Session.findOne({ sessionId });
    if (!sessionDoc) return res.status(404).json({ message: "Session not found" });

    // find order by reference
    const order = sessionDoc.orders.find((o) => o.paystackReference === reference);
    if (!order) return res.status(404).json({ message: "Order not found for this reference" });

    // call paystack verify
    const resp = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const status = resp.data.data.status;
    if (status === "success") {
      order.status = "paid";
      await sessionDoc.save();
      return res.json({ message: "Payment verified", status: "paid" });
    }

    return res.json({ message: "Payment not successful", status });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
