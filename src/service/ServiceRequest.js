const mongoose = require("mongoose");

const STATUSES = ["open", "scheduled", "in_progress", "resolved", "closed"];

// A breakdown / service visit request, or an AMC (annual maintenance contract) booking
const serviceRequestSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true, index: true }, // SR-20261023-0042
    type: { type: String, enum: ["service", "amc"], default: "service", index: true },
    userId: { type: String, default: null, index: true }, // set when logged in
    contact: {
      name: { type: String, required: true, trim: true, maxlength: 100 },
      company: { type: String, default: "", trim: true, maxlength: 150 },
      phone: { type: String, required: true, trim: true, maxlength: 30 },
      email: { type: String, default: "", trim: true, lowercase: true, maxlength: 150, index: true },
    },
    machine: {
      name: { type: String, default: "", trim: true, maxlength: 200 },
      model: { type: String, default: "", trim: true, maxlength: 100 },
      serialNumber: { type: String, default: "", trim: true, maxlength: 100 },
      installedYear: { type: Number, min: 1950, max: 2100 },
    },
    issue: { type: String, default: "", trim: true, maxlength: 3000 }, // what is wrong / what is needed
    urgency: { type: String, enum: ["normal", "urgent", "machine_down"], default: "normal" },
    photos: { type: [String], default: [] }, // Cloudinary URLs (logged-in customers)
    amc: {
      planId: { type: String, default: "" },
      planName: { type: String, default: "", maxlength: 120 },
      machines: { type: Number, min: 1, max: 500 },
    },
    city: { type: String, default: "", trim: true, maxlength: 100 },
    state: { type: String, default: "", trim: true, maxlength: 100 },

    status: { type: String, enum: STATUSES, default: "open", index: true },
    scheduledFor: { type: Date },
    // Timeline the customer sees in their dashboard
    updates: [
      {
        _id: false,
        at: { type: Date, default: Date.now },
        status: { type: String, enum: STATUSES },
        note: { type: String, default: "", maxlength: 1000 },
      },
    ],
    adminNotes: { type: String, default: "", maxlength: 3000 }, // private
    emails: {
      adminSentAt: { type: Date },
      customerSentAt: { type: Date },
      error: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);
module.exports = ServiceRequest;
module.exports.STATUSES = STATUSES;
