// The single place that decides order totals and coupon discounts.
// Used by the coupon check, Stripe payment creation and order saving,
// so the customer, Stripe and the saved order always agree.
const Offer = require("./Offer");

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

// Same rule the checkout page shows: free shipping from ₹10,000
const shippingFor = (subtotal) => (subtotal >= 10000 ? 0 : 99);

// Subtotal from the order lines (never from a client-sent "subtotal" field)
const subtotalOf = (items = []) =>
  round2(items.reduce((sum, i) => sum + Math.max(0, Number(i.price) || 0) * Math.max(1, parseInt(i.quantity, 10) || 1), 0));

const inr = (n) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// → { valid, discount, code, label, message }
const evaluateCoupon = async (rawCode, subtotal) => {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return { valid: false, discount: 0, message: "Please enter a coupon code." };

  const now = new Date();
  const offer = await Offer.findOne({ code, isActive: true, discountType: { $in: ["percent", "flat"] }, discountValue: { $gt: 0 } })
    .sort({ priority: -1, createdAt: -1 })
    .lean();
  if (!offer) return { valid: false, discount: 0, code, message: "This coupon code isn't valid." };
  if (offer.startsAt && new Date(offer.startsAt) > now) return { valid: false, discount: 0, code, message: "This coupon isn't active yet." };
  if (offer.endsAt && new Date(offer.endsAt) <= now) return { valid: false, discount: 0, code, message: "This coupon has expired." };
  if (offer.minOrderAmount && subtotal < offer.minOrderAmount) {
    return {
      valid: false,
      discount: 0,
      code,
      message: `Add ${inr(offer.minOrderAmount - subtotal)} more to use this code (minimum order ${inr(offer.minOrderAmount)}).`,
    };
  }

  let discount = offer.discountType === "percent" ? (subtotal * offer.discountValue) / 100 : offer.discountValue;
  if (offer.discountType === "percent" && offer.maxDiscount > 0) discount = Math.min(discount, offer.maxDiscount);
  discount = round2(Math.min(discount, subtotal)); // never below zero

  const label = offer.discountType === "percent" ? `${offer.discountValue}% off` : `${inr(offer.discountValue)} off`;
  return { valid: true, discount, code, label, offerId: String(offer._id), message: `${code} applied — you save ${inr(discount)}!` };
};

// Full price breakdown for an order
const priceOrder = async (items, couponCode) => {
  const subtotal = subtotalOf(items);
  const shippingCost = shippingFor(subtotal);
  const coupon = couponCode ? await evaluateCoupon(couponCode, subtotal) : null;
  const discount = coupon?.valid ? coupon.discount : 0;
  return {
    subtotal,
    shippingCost,
    discount,
    couponCode: coupon?.valid ? coupon.code : "",
    coupon,
    totalAmount: round2(subtotal - discount + shippingCost),
  };
};

module.exports = { evaluateCoupon, priceOrder, shippingFor, subtotalOf, round2 };
