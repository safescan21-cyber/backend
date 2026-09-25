// src/middlewere/visitTracker.js
const Visit = require('../visitor/Visitmodel');
const crypto = require('crypto');

const getVisitorId = (req, res) => {
  // Ensure req.cookies exists
  if (!req.cookies) {
    req.cookies = {};
  }
  let visitorId = req.cookies.visitorId;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    if (res && typeof res.cookie === 'function') {
      res.cookie('visitorId', visitorId, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      });
    }
  }
  return visitorId;
};

const visitTracker = async (req, res, next) => {
  const skipPaths = ['/api/admin', '/api/auth', '/static', '/favicon.ico', '/_next'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  try {
    const visitorId = getVisitorId(req, res);
    const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
    const userAgent = req.get('User-Agent') || 'unknown';
    const page = req.originalUrl || req.url || '/';
    const referrer = req.get('Referrer') || req.get('Referer') || 'direct';

    const visit = new Visit({ visitorId, ip, userAgent, page, referrer });
    await visit.save();
  } catch (error) {
    console.error('Visit tracking error:', error);
  }

  next();
};

module.exports = visitTracker;