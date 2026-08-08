const mongoose = require("mongoose");

const SpecificationSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
}, { _id: false });

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    images: { type: [String], required: true },
    color: { type: String, required: true },
    rating: { type: Number, default: 0 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    warranty: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    readyToDispatch: { type: Boolean, default: false },

    // ✅ NEW: technical specifications (e.g. Capacity: "500kg",
    // Accuracy: "±0.02%", Output: "2mV/V") — free-form key/value pairs
    // so it works for any product category without a fixed schema.
    specifications: { type: [SpecificationSchema], default: [] },
  },
  { timestamps: true }
);

const Products = mongoose.model("Product", ProductSchema);

module.exports = Products;