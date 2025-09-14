const Session = require("../models/Session");

async function sessionMiddleware(req, res, next) {
  try {
    // For now, simulate a user identifier
    // Replace this with actual phone/email/userId from request
    const userId = req.body.userId || "test-user"; 

    // Try to find session
    let sessionDoc = await Session.findOne({ userId });

    // If not found, create one
    if (!sessionDoc) {
      sessionDoc = new Session({
        userId,
        currentOrder: { items: [], total: 0 },
        orders: [],
      });
      await sessionDoc.save();
    }

    // Attach to request for use in controllers
    req.sessionDoc = sessionDoc;
    next();
  } catch (err) {
    console.error("Session middleware error:", err);
    res.status(500).json({ error: "Session initialization failed" });
  }
}

module.exports = sessionMiddleware;
