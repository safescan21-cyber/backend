// src/middlewere/authMiddleware.js
// Your original middleware, with 3 changes:
//  1. Tries EVERY token it receives (cookie AND Bearer header); a stale cookie
//     no longer blocks a valid Bearer token.
//  2. Reads JWT_SECRET when a request arrives, with the same fallback that
//     userroute.js uses to sign tokens (so signing and verifying always match).
//  3. No longer prints the decoded token to the log.
const jwt = require('jsonwebtoken');

const getSecret = () => process.env.JWT_SECRET || 'fallback_secret_key';

const getCandidateTokens = (req) => {
  const tokens = [];
  if (req.cookies?.token) tokens.push(req.cookies.token);
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const t = authHeader.split(' ')[1];
    if (t && !tokens.includes(t)) tokens.push(t);
  }
  return tokens;
};

const verifyToken = (req, res, next) => {
  const tokens = getCandidateTokens(req);

  if (tokens.length === 0) {
    return res.status(401).json({
      success: false,
      message: 'No token provided. Please login.',
    });
  }

  let lastError = null;
  for (const token of tokens) {
    try {
      const decoded = jwt.verify(token, getSecret());

      req.userId = decoded.userId || decoded.id || decoded._id;
      req.role = decoded.role;

      if (!req.role) {
        console.error('WARNING: No role found in token!');
      }
      return next();
    } catch (error) {
      lastError = error; // try the next token
    }
  }

  console.error('Error while verifying token:', lastError && lastError.message);
  if (lastError && lastError.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Session expired. Please login again.',
    });
  }
  return res.status(401).json({
    success: false,
    message: 'Invalid token. Please login again.',
  });
};

const verifyAdmin = (req, res, next) => {
  if (!req.role) {
    return res.status(403).json({
      success: false,
      message: 'No role found in token. Please login again.',
    });
  }

  if (req.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to perform this action. Admin access required.',
    });
  }
  next();
};

// Reads the login if there is one, but never blocks the request
const optionalAuth = (req, res, next) => {
  for (const token of getCandidateTokens(req)) {
    try {
      const decoded = jwt.verify(token, getSecret());
      req.userId = decoded.userId || decoded.id || decoded._id;
      req.role = decoded.role;
      break;
    } catch {
      // try the next token
    }
  }
  next();
};

module.exports = { verifyToken, verifyAdmin, optionalAuth };