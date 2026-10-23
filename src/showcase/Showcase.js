const mongoose = require("mongoose");

// Real-world proof for the website, all entered by the admin:
//  kind "photo":  factory / team / testing / dispatch / installation photos (/factory)
//  kind "client": a customer installation (name, city, state, machine, year) and,
//                 only with the customer's permission, their logo (/factory, city pages)
const SECTIONS = ["workshop", "team", "testing", "dispatch", "installation", "quality"];

const showcaseSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["photo", "client"], required: true, index: true },
    title: { type: String, default: "", trim: true, maxlength: 150 },   // caption / client name
    section: { type: String, enum: [...SECTIONS, ""], default: "" },     // photos
    imageUrl: { type: String, default: "", trim: true, maxlength: 500 }, // photo / client logo (Cloudinary)
    city: { type: String, default: "", trim: true, maxlength: 100 },
    state: { type: String, default: "", trim: true, maxlength: 100 },
    machine: { type: String, default: "", trim: true, maxlength: 200 },  // what was installed
    year: { type: Number, min: 1950, max: 2100 },
    showLogo: { type: Boolean, default: false },  // the customer agreed to their logo being shown
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Showcase", showcaseSchema);
module.exports.SECTIONS = SECTIONS;
