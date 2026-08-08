const mongoose = require("mongoose");

// ── Sub-schemas ───────────────────────────────────────────────
const CustomerInfoSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true },
  phone:     { type: String, required: true },
}, { _id: false });

const ShippingAddressSchema = new mongoose.Schema({
  addressLine1:        { type: String, required: true },
  addressLine2:        { type: String, default: "" },
  city:                { type: String, required: true },
  state:               { type: String, required: true },
  pincode:             { type: String, required: true },
  country:             { type: String, default: "India" },
  deliveryInstructions:{ type: String, default: "" },
}, { _id: false });

const OrderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name:      { type: String, required: true },
  price:     { type: Number, required: true },
  quantity:  { type: Number, required: true, min: 1 },
  image:     { type: String, default: "" },
  category:  { type: String, default: "" },
}, { _id: false });

// ── Main Order schema ─────────────────────────────────────────
const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    customerInfo:    { type: CustomerInfoSchema,    required: true },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    items: {
      type:     [OrderItemSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message:   "Order must contain at least one item",
      },
    },
    subtotal:    { type: Number, required: true, min: 0 },
    shippingCost:{ type: Number, default: 99,    min: 0 },
    discount:    { type: Number, default: 0,     min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    paymentMethod: {
      type:    String,
      enum:    ["cod", "card", "upi", "wallet"],
      default: "cod",
    },
    paymentStatus: {
      type:    String,
      enum:    ["pending", "paid", "failed", "refunded", "processing"],
      default: "pending",
    },
    paymentIntentId: { type: String, default: null },

    orderStatus: {
      type:    String,
      enum:    [
        "confirmed", "processing", "shipped",
        "delivered", "cancelled", "payment_failed", "refunded",
      ],
      default: "confirmed",
    },

    // ── Top‑level email (lowercased, indexed) ────────────────
    email: {
      type:     String,
      required: true,
      index:    true,
      lowercase: true,      // mongoose automatically lowercases on save
    },

    orderDate: {
      type:    Date,
      default: Date.now,
    },
    estimatedDelivery: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────
OrderSchema.index({ "customerInfo.email": 1 });
OrderSchema.index({ paymentIntentId: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ createdAt: -1 });

// ── Pre‑save: ensure top‑level email matches customerInfo.email ──
// ✅ Fixed: synchronous middleware – no `next` parameter needed
OrderSchema.pre("save", function () {
  if (this.customerInfo && this.customerInfo.email) {
    this.email = this.customerInfo.email.toLowerCase();
  }
});

// ── Virtual ─────────────────────────────────────────────────
OrderSchema.virtual("customerFullName").get(function () {
  return `${this.customerInfo.firstName} ${this.customerInfo.lastName}`;
});

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;