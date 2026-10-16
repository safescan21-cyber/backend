const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    productId: { type: String, default: "" },
    name:      { type: String, required: true, trim: true, maxlength: 200 },
    quantity:  { type: Number, required: true, min: 1, max: 1000000 },
    notes:     { type: String, default: "", trim: true, maxlength: 500 },
  },
  { _id: false }
);

// A bulk order / quote request from the "Bulk Quote" page
const bulkQuoteSchema = new mongoose.Schema(
  {
    quoteNumber: { type: String, required: true, unique: true, index: true }, // BQ-20261016-0042
    userId:      { type: String, default: null, index: true },                // set when logged in
    contact: {
      name:    { type: String, required: true, trim: true, maxlength: 100 },
      company: { type: String, default: "", trim: true, maxlength: 150 },
      email:   { type: String, required: true, trim: true, lowercase: true, maxlength: 150, index: true },
      phone:   { type: String, required: true, trim: true, maxlength: 30 },
      gstin:   { type: String, default: "", trim: true, uppercase: true, maxlength: 20 },
    },
    items:        { type: [itemSchema], validate: [(v) => v.length > 0 && v.length <= 50, "Add between 1 and 50 items"] },
    deliveryCity: { type: String, default: "", trim: true, maxlength: 100 },
    deliveryState:{ type: String, default: "", trim: true, maxlength: 100 },
    country:      { type: String, default: "India", trim: true, maxlength: 60 },
    requiredBy:   { type: Date },
    message:      { type: String, default: "", trim: true, maxlength: 3000 },
    source:       { type: String, enum: ["navbar", "cart", "product", "other"], default: "other" },

    status: {
      type: String,
      enum: ["new", "contacted", "quoted", "won", "lost"],
      default: "new",
      index: true,
    },
    adminNotes:  { type: String, default: "", maxlength: 3000 },

    // Email delivery: the customer confirmation is sent only after the business email
    emails: {
      adminSentAt:    { type: Date },
      customerSentAt: { type: Date },
      error:          { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BulkQuote", bulkQuoteSchema);
