const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ── Sub‑schema for a single address ──────────────────────────────────────
const AddressSchema = new mongoose.Schema({
  label: {
    type: String,
    enum: ['Home', 'Office', 'Other'],
    default: 'Home',
  },
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true },
  phone:     { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String, default: '' },
  city:     { type: String, required: true },
  state:    { type: String, required: true },
  pincode:  { type: String, required: true },
  country:  { type: String, default: 'India' },
  deliveryInstructions: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
}, { _id: true, timestamps: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,      // ✅ this is what guarantees no duplicate Google/email accounts with the same address
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,    // Google users get a random hashed password auto-generated (never used to log in)
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  profilePicture: {
    type: String,
    default: "https://www.pngall.com/wp-content/uploads/5/User-Profile-PNG-High-Quality-Image.png",
  },
  bio: {
    type: String,
    maxlength: 200,
  },
  profession: {
    type: String,
    maxlength: 100,
  },
  // ── Legacy single address (kept for old data, optional) ──
  address: {
    street: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
  // ── Multiple addresses ──────────────────────────────────
  addresses: [AddressSchema],

  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);