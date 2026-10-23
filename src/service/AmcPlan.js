const mongoose = require("mongoose");

// An annual maintenance contract plan, written by the admin and shown on /amc
const amcPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },     // "Standard AMC"
    summary: { type: String, default: "", trim: true, maxlength: 300 },
    visitsPerYear: { type: Number, min: 0, max: 52, default: 0 },           // preventive visits
    priceText: { type: String, default: "Price on request", trim: true, maxlength: 120 }, // "₹45,000 per machine per year"
    features: { type: [String], default: [] },                             // what is covered
    highlight: { type: Boolean, default: false },                          // "most popular" badge
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AmcPlan", amcPlanSchema);
