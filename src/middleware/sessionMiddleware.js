const { v4: uuidv4 } = require("uuid");
const Session = require("../models/Session");

// cookieName we'll use
const COOKIE_NAME = "sessionId";
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

async function sessionMiddleware(req, res, next) {
  try {
    // read cookie
    let sessionId = req.cookies[COOKIE_NAME];
    if (!sessionId) {
      // create a new session id and set cookie
      sessionId = uuidv4();
      // set cookie (httpOnly for security)
      res.cookie(COOKIE_NAME, sessionId, { httpOnly: true, maxAge: COOKIE_MAX_AGE });
    }

    // find or create session in DB
    let sessionDoc = await Session.findOne({ sessionId });
    if (!sessionDoc) {
      sessionDoc = new Session({ sessionId });
      await sessionDoc.save();
    }

    // attach to request so controllers can read/write and later save
    req.sessionId = sessionId;
    req.sessionDoc = sessionDoc;

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = sessionMiddleware;
