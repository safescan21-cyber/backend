const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  comment: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  productId: { type: String, required: true },   // ✅ Changed from ObjectId to String
  userId: { type: String, required: true },
  userName: { type: String, default: 'Anonymous' },
  userImage: { type: String, default: '' },
  images: [String],
  helpful: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Reviews = mongoose.model("Review",reviewSchema );

module.exports = Reviews;
