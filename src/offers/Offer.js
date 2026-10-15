const mongoose = require("mongoose");

// A promotional offer shown as a banner on the home page
const offerSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true, trim: true, maxlength: 80 },   // "Diwali Mega Sale"
    subtitle:     { type: String, default: "", trim: true, maxlength: 200 },     // "On all tablet presses"
    discountText: { type: String, default: "", trim: true, maxlength: 20 },      // "25% OFF"
    code:         { type: String, default: "", trim: true, uppercase: true, maxlength: 30 },
    // How the code discounts the order at checkout (leave discountType empty for a banner-only offer)
    discountType:   { type: String, enum: ["", "percent", "flat"], default: "" },
    discountValue:  { type: Number, default: 0, min: 0 },     // 25 = 25% or ₹25
    minOrderAmount: { type: Number, default: 0, min: 0 },     // order subtotal needed to use the code
    maxDiscount:    { type: Number, default: 0, min: 0 },     // cap for percent discounts (0 = no cap)
    ctaText:      { type: String, default: "Shop now", trim: true, maxlength: 30 },
    ctaLink:      { type: String, default: "/shop", trim: true, maxlength: 300 },
    theme:        { type: String, enum: ["orange", "blue", "green", "purple", "red", "dark"], default: "orange" },
    startsAt:     { type: Date, default: Date.now },
    endsAt:       { type: Date },          // empty = no end date (no countdown)
    isActive:     { type: Boolean, default: true },
    priority:     { type: Number, default: 0 },  // higher shows first
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
