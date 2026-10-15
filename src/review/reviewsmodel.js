const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  userName:  { type: String, default: "Customer" },
  text:      { type: String, required: true, maxlength: 1000 },
  isBlocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const reviewSchema = new mongoose.Schema({
  comment: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  productId: { type: String, required: true, index: true },
  userId: { type: String, required: true },   // account ID, or "guest:<random>" for guests
  userName: { type: String, default: 'Anonymous' },
  userImage: { type: String, default: '' },
  images: [String],
  helpful: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },

  // Reactions: account IDs of people who liked / disliked
  likes:    { type: [String], default: [] },
  dislikes: { type: [String], default: [] },

  comments: { type: [commentSchema], default: [] },

  // Moderation
  isBlocked:   { type: Boolean, default: false, index: true },
  blockedAt:   { type: Date },

  createdAt: { type: Date, default: Date.now }
});

const Reviews = mongoose.model("Review",reviewSchema );

module.exports = Reviews;
