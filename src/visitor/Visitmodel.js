const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, index: true },
    userId: { type: String, default: null, index: true }, // set when the visitor was logged in
    ip: { type: String, default: '0.0.0.0' },
    userAgent: { type: String, default: 'unknown' },
    page: { type: String, default: '/' },
    referrer: { type: String, default: 'direct' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model('Visit', visitSchema);