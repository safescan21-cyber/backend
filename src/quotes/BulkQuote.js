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
      // Optional only for quick quotes (machine page form: name + phone is enough)
      email:   { type: String, required: function () { return this.source !== "quick"; }, default: "", trim: true, lowercase: true, maxlength: 150, index: true },
      phone:   { type: String, required: true, trim: true, maxlength: 30 },
      gstin:   { type: String, default: "", trim: true, uppercase: true, maxlength: 20 },
    },
    items:        { type: [itemSchema], validate: [(v) => v.length > 0 && v.length <= 50, "Add between 1 and 50 items"] },
    deliveryCity: { type: String, default: "", trim: true, maxlength: 100 },
    deliveryState:{ type: String, default: "", trim: true, maxlength: 100 },
    country:      { type: String, default: "India", trim: true, maxlength: 60 },
    requiredBy:   { type: Date },
    message:      { type: String, default: "", trim: true, maxlength: 3000 },
    source:       { type: String, enum: ["navbar", "cart", "product", "quick", "other"], default: "other" }, // quick = "Get a quote in 2 minutes" form

    status: {
      type: String,
      enum: ["new", "contacted", "quoted", "won", "lost"],
      default: "new",
      index: true,
    },
    adminNotes:  { type: String, default: "", maxlength: 3000 },

    // Where the lead came from (first visit: utm tags / referring site / landing page)
    origin: {
      channel:  { type: String, default: "", maxlength: 40 },  // google, whatsapp, indiamart, direct…
      source:   { type: String, default: "", maxlength: 100 }, // utm_source or referring host
      medium:   { type: String, default: "", maxlength: 100 },
      campaign: { type: String, default: "", maxlength: 150 },
      landing:  { type: String, default: "", maxlength: 300 },
    },

    // Formal quotation made in admin (Quotation builder) and sent to the customer
    quotation: {
      number:       { type: String, default: "" },                 // QT-20261023-0042
      items: [
        {
          _id: false,
          name:      { type: String, trim: true, maxlength: 200 },
          quantity:  { type: Number, min: 1, max: 1000000, default: 1 },
          unitPrice: { type: Number, min: 0, default: 0 },          // INR, before GST
          notes:     { type: String, trim: true, maxlength: 500, default: "" },
        },
      ],
      gstPercent:   { type: Number, min: 0, max: 28, default: 18 },
      freight:      { type: Number, min: 0, default: 0 },          // INR, added before GST
      deliveryTime: { type: String, default: "", maxlength: 200 },
      paymentTerms: { type: String, default: "", maxlength: 500 },
      warranty:     { type: String, default: "", maxlength: 300 },
      validityDays: { type: Number, min: 1, max: 365, default: 15 },
      notes:        { type: String, default: "", maxlength: 2000 },
      subtotal:     { type: Number, default: 0 },
      gst:          { type: Number, default: 0 },
      total:        { type: Number, default: 0 },
      publicToken:  { type: String, default: "", index: true },     // link to the PDF for WhatsApp
      updatedAt:    { type: Date },
      sentAt:       { type: Date },
      sentTo:       { type: String, default: "" },
      followUpSentAt: { type: Date },                              // "any questions?" email, once
    },

    // Reminder to the business when a new lead has waited a day without a reply
    reminders: {
      adminSentAt: { type: Date },
    },

    // Email delivery: the customer confirmation is sent only after the business email
    emails: {
      adminSentAt:    { type: Date },
      customerSentAt: { type: Date },
      customerMessageId: { type: String, default: "" }, // Gmail's receipt for the confirmation
      error:          { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BulkQuote", bulkQuoteSchema);
