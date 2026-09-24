const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  type: { type: String, enum: ['image', 'video', 'document'], default: 'image' },
  caption: { type: String, trim: true },
  thumbnail: { type: String }, // optional – for video thumbnails
});

const pressReleaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    summary: { type: String, trim: true },
    publishedDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    media: [mediaSchema],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PressRelease', pressReleaseSchema);