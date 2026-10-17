// The single place that decides order totals and coupon discounts.
// Used by the coupon check, Stripe payment creation and order saving,
// so the customer, Stripe and the saved order always agree.
const Offer = require("./Offer");
const mongoose = require("mongoose");
const Products = require("../products/productsmodel");
const PharmaApi = require("../pharmaApi/PharmaApi");

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

// Order lines priced from the database: machines from Products, pharma APIs
// from PharmaApi. The browser only says what and how many; never the price.
// Throws { status: 400, message } when a line can't be sold.
const MAX_LINES = 50;
const priceLines = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) throw Object.assign(new Error("Your cart is empty"), { status: 400 });
  if (items.length > MAX_LINES) throw Object.assign(new Error(`An order can have up to ${MAX_LINES} different items`), { status: 400 });
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  const isId = (id) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id) && /^[a-f0-9]{24}$/i.test(id);
  const lines = [];
  for (const raw of items) {
    const id = String(raw?.productId || "");
    const quantity = parseInt(raw?.quantity, 10);
    if (!isId(id)) fail("One of the items in your cart is no longer available. Please remove it and try again.");
    if (!(quantity >= 1 && quantity <= 100000)) fail("Please check the quantities in your cart.");
    if (raw?.kind === "api") {
      const api = await PharmaApi.findById(id).select("name images category active sellOnline unitPrice unit minOrderQty slug").lean();
      if (!api || !api.active || !api.sellOnline || !(api.unitPrice > 0)) fail(`${api?.name || "An API in your cart"} can't be bought online right now. Please send an enquiry instead.`);
      if (quantity < (api.minOrderQty || 1)) fail(`Minimum order for ${api.name} is ${api.minOrderQty} ${api.unit}.`);
      lines.push({ kind: "api", productId: id, name: api.name, price: api.unitPrice, quantity, unit: api.unit || "kg", image: api.images?.[0] || "", category: api.category || "", slug: api.slug });
    } else {
      const p = await Products.findById(id).select("name price images category active sellOnline").lean();
      if (!p || p.active === false || !(Number(p.price) > 0)) fail("One of the items in your cart is no longer available. Please remove it and try again.");
      if (p.sellOnline === false) fail(`${p.name} is available on enquiry only. Please request a quotation.`);
      lines.push({ kind: "product", productId: id, name: p.name, price: Number(p.price), quantity, unit: "", image: p.images?.[0] || "", category: p.category || "" });
    }
  }
  return lines;
};

// Full price breakdown for an order (items: { productId, quantity, kind })
const priceOrder = async (rawItems, couponCode) => {
  const items = await priceLines(rawItems);
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
    items,
    hasApi: items.some((i) => i.kind === "api"),
    totalAmount: round2(subtotal - discount + shippingCost),
  };
};

module.exports = { evaluateCoupon, priceOrder, priceLines, shippingFor, subtotalOf, round2 };
