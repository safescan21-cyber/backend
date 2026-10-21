// Customer testimonials. Only real customers: submitted through the public form
// (with permission to publish) or added by the admin with the customer's OK.
// Nothing is shown on the website until the admin approves it.
const mongoose = require('mongoose');

const TestimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, trim: true, maxlength: 80 },        // e.g. Production Manager
    company: { type: String, trim: true, maxlength: 120 },
    city: { type: String, trim: true, maxlength: 60 },
    quote: { type: String, required: true, trim: true, minlength: 20, maxlength: 1000 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    photo: { type: String, trim: true, default: '' },          // Cloudinary URL, only with permission
    logo: { type: String, trim: true, default: '' },           // company logo, only with permission
    email: { type: String, trim: true, lowercase: true, maxlength: 200 }, // private, never shown
    consent: { type: Boolean, default: false },                // customer agreed to be published
    verifiedBuyer: { type: Boolean, default: false },          // email matches an order
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    featured: { type: Boolean, default: false },               // shown first on Home / About
    source: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

TestimonialSchema.index({ status: 1, featured: -1, approvedAt: -1 });

module.exports = mongoose.model('Testimonial', TestimonialSchema);
