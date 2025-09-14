const express = require("express");
const axios = require("axios");
const router = express.Router();
const Session = require("../models/Session");

// Initialize a Paystack transaction for an order
router.post("/init", async (req, res, next) => {
  try {
    const { orderIndex } = req.body;
    const sessionDoc = req.sessionDoc;
    
    // Validate orderIndex
    if (!orderIndex) {
      return res.status(400).json({ message: "orderIndex is required" });
    }
    
    const idx = parseInt(orderIndex, 10) - 1;
    
    if (!sessionDoc || !sessionDoc.orders || !sessionDoc.orders[idx]) {
      return res.status(400).json({ message: "Order not found" });
    }
    
    const order = sessionDoc.orders[idx];
    
    if (order.status === "paid") {
      return res.status(400).json({ message: "Order already paid" });
    }
    
    // Validate order total
    if (!order.total || order.total <= 0) {
      return res.status(400).json({ message: "Invalid order amount" });
    }
    
    // Generate unique reference
    const reference = `${sessionDoc.sessionId}-${orderIndex}-${Date.now()}`;
    
    // Prepare payload for Paystack
    const payload = {
      amount: Math.round(order.total * 100), // Paystack expects kobo (Naira * 100)
      email: "customer@example.com", // You might want to collect this from user
      reference: reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL || `${req.protocol}://${req.get('host')}/paystack/callback`,
      metadata: {
        orderIndex: orderIndex,
        sessionId: sessionDoc.sessionId
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
    order.status = "pending"; // Set status to pending
    await sessionDoc.save();
    
    return res.json({ 
      success: true,
      authorization_url: response.data.data.authorization_url,
      reference: reference
    });
    
  } catch (err) {
    console.error('Paystack init error:', err.response?.data || err.message);
    if (err.response?.status === 401) {
      return res.status(500).json({ message: "Invalid Paystack secret key" });
    }
    next(err);
  }
});

// Verify endpoint: Check payment status
router.post("/verify", async (req, res, next) => {
  try {
    const { reference } = req.body; // Changed from query to body
    const sessionId = req.cookies.sessionId;
    
    if (!reference || !sessionId) {
      return res.status(400).json({ message: "Missing reference or session ID" });
    }
    
    const sessionDoc = await Session.findOne({ sessionId });
    if (!sessionDoc) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    // Find order by reference
    const order = sessionDoc.orders.find((o) => o.paystackReference === reference);
    if (!order) {
      return res.status(404).json({ message: "Order not found for this reference" });
    }
    
    // Call Paystack verify API
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { 
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    
    const transactionData = response.data.data;
    const status = transactionData.status;
    
    if (status === "success") {
      order.status = "paid";
      order.paidAt = new Date();
      order.paystackData = {
        amount: transactionData.amount,
        currency: transactionData.currency,
        transaction_date: transactionData.transaction_date,
        channel: transactionData.channel
      };
      await sessionDoc.save();
      
      return res.json({ 
        success: true,
        message: "Payment verified successfully", 
        status: "paid",
        order: order
      });
    }
    
    return res.json({ 
      success: false,
      message: "Payment not successful", 
      status: status 
    });
    
  } catch (err) {
    console.error('Paystack verify error:', err.response?.data || err.message);
    if (err.response?.status === 404) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    next(err);
  }
});

// Callback endpoint: Handle Paystack redirect (optional)
router.get("/callback", async (req, res) => {
  try {
    const { reference } = req.query;
    
    if (!reference) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=missing_reference`);
    }
    
    // Redirect to frontend with reference for verification
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?reference=${reference}&status=callback`);
    
  } catch (err) {
    console.error('Callback error:', err);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=callback_failed`);
  }
});

module.exports = router;