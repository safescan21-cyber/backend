const mongoose = require('mongoose');

const HeroSlideSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  cta: {
    type: String,
    default: 'Shop Now',
  },
  ctaLink: {
    type: String,
    default: '/products',
  },
  category: {
    type: String,
    default: 'professional',
  },
  order: {
    type: Number,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('HeroSlide', HeroSlideSchema);