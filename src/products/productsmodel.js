const mongoose = require("mongoose");

const SpecificationSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
}, { _id: false });

// Technical documents (datasheets, manuals, drawings) stored on this server;
// see src/documents/documentFiles.js
const DocumentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  file: { type: String, required: true, match: /^[a-f0-9]{32}\.[a-z]{3,4}$/ },
  size: { type: Number, default: 0 },
  type: { type: String, trim: true },
}, { _id: false });

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    // Empty / 0 = no listed price: the website shows "Contact for price" and it can't be bought online
    price: { type: Number, default: 0, min: 0, set: (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v)) },
    oldPrice: { type: Number },
    images: { type: [String], required: true },
    // Product videos (Cloudinary URLs) — the admin form uploads these
    videos: { type: [String], default: [] },
    color: { type: String, required: true },
    origin: { type: String, trim: true },
    // Model number (e.g. "ZP-35D"); part of every serial number made when the machine is sold
    modelNumber: { type: String, trim: true, maxlength: 60, default: '' },
    // Who makes the machine (shown on the product page and spec sheet)
    manufacturer: { type: String, trim: true, maxlength: 120, default: '' },
    // A discount code (Admin → Discount Offers) to show on this product while it is valid
    couponCode: { type: String, trim: true, uppercase: true, maxlength: 30, default: '' },
    productType: { type: String, trim: true },
    rating: { type: Number, default: 0 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    warranty: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    readyToDispatch: { type: Boolean, default: false },

    // ✅ NEW: technical specifications (e.g. Capacity: "500kg",
    // Accuracy: "±0.02%", Output: "2mV/V") — free-form key/value pairs
    // so it works for any product category without a fixed schema.
    specifications: { type: [SpecificationSchema], default: [] },
    documents: { type: [DocumentSchema], default: [] },
    // Spare parts: the machine models this part fits ("ZP-35D", "NJP-1200"…), used by
    // the /spares finder. Cleaned to unique, trimmed names (max 40).
    fitsModels: {
      type: [String],
      default: [],
      set: (list) => [...new Set((Array.isArray(list) ? list : String(list || '').split(','))
        .map((m) => String(m).trim().slice(0, 60)).filter(Boolean))].slice(0, 40),
    },
    // Questions buyers ask about this machine (product page + FAQ rich results on Google)
    faqs: {
      type: [{ _id: false, q: { type: String, trim: true, maxlength: 300 }, a: { type: String, trim: true, maxlength: 2000 } }],
      default: [],
      set: (list) => (Array.isArray(list) ? list : [])
        .map((f) => ({ q: String(f?.q || '').trim().slice(0, 300), a: String(f?.a || '').trim().slice(0, 2000) }))
        .filter((f) => f.q && f.a).slice(0, 15),
    },
    // Admin controls: hidden products are off the website; sellOnline false = enquiry only
    active: { type: Boolean, default: true },
    sellOnline: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Products = mongoose.model("Product", ProductSchema);

module.exports = Products;