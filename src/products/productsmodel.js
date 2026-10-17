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
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    images: { type: [String], required: true },
    // Product videos (Cloudinary URLs) — the admin form uploads these
    videos: { type: [String], default: [] },
    color: { type: String, required: true },
    origin: { type: String, trim: true },
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
    // Admin controls: hidden products are off the website; sellOnline false = enquiry only
    active: { type: Boolean, default: true },
    sellOnline: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Products = mongoose.model("Product", ProductSchema);

module.exports = Products;