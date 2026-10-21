const mongoose = require("mongoose");

// One row per thing a visitor did (only for visitors who accepted analytics cookies)
const activityEventSchema = new mongoose.Schema({
  visitorId:   { type: String, required: true, index: true },  // random ID stored in the browser
  userId:      { type: String, default: null, index: true },   // set when the visitor is logged in
  type: {
    type: String,
    required: true,
    enum: ["page_view", "product_view", "product_like", "product_unlike", "add_to_cart", "product_share"],
  },
  path:        { type: String, default: "" },
  productId:   { type: String, default: null, index: true },
  productName: { type: String, default: "" },
  referrer:    { type: String, default: "" },
  device:      { type: String, default: "" },  // mobile / tablet / desktop
  createdAt:   { type: Date, default: Date.now },
});

// Kept 7 days, then deleted automatically (see utils/dataRetention.js)
activityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
activityEventSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityEvent", activityEventSchema);
