// src/middlewere/visitTracker.js
// Logs one "visit" per request for the admin User Analytics page.
// Visits are buffered and saved in one insertMany every few seconds, so the
// request never waits for the database and each batch costs one operation.
const Visit = require('../visitor/Visitmodel');
const crypto = require('crypto');

const FLUSH_MS = 5000;
const MAX_BATCH = 200;
const MAX_BUFFER = 5000; // drop new visits if the database is unreachable for long
let buffer = [];

const flush = async () => {
  if (!buffer.length) return;
  const batch = buffer.splice(0, MAX_BATCH);
  try {
    await Visit.insertMany(batch, { ordered: false });
  } catch (error) {
    console.error('Visit tracking error:', error.message);
  }
  if (buffer.length) setImmediate(flush);
};
setInterval(flush, FLUSH_MS).unref();

const getVisitorId = (req, res) => {
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

const visitTracker = (req, res, next) => {
  const skipPaths = ['/api/admin', '/api/auth', '/api/insights', '/static', '/favicon.ico', '/_next', '/health'];
  if (req.method === 'OPTIONS' || skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  try {
    if (buffer.length < MAX_BUFFER) {
      buffer.push({
        visitorId: getVisitorId(req, res),
        ip: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        userAgent: req.get('User-Agent') || 'unknown',
        page: req.originalUrl || req.url || '/',
        referrer: req.get('Referrer') || req.get('Referer') || 'direct',
        timestamp: new Date(),
      });
      if (buffer.length >= MAX_BATCH) setImmediate(flush);
    }
  } catch (error) {
    console.error('Visit tracking error:', error);
  }

  next();
};

visitTracker.flush = flush; // used on shutdown
module.exports = visitTracker;
