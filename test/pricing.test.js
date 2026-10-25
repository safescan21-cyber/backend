// Unit tests: order pricing, coupons and serial numbers. Run: npm test
// The database is never used: model methods are replaced with stand-ins.
const test = require("node:test");
const assert = require("node:assert/strict");
const Offer = require("../src/offers/Offer");
const Products = require("../src/products/productsmodel");
const { SerialCounter } = require("../src/soldMachines/SoldMachine");
const { evaluateCoupon, priceOrder, shippingFor, subtotalOf } = require("../src/offers/coupon");
const { modelCode, nextSerial } = require("../src/soldMachines/serials");

// Mongoose-style query: .select() / .sort() chain, .lean() resolves
const query = (value) => ({ select() { return this; }, sort() { return this; }, lean: async () => value });
const ID = "6ad20d0d5d94effd760752d6";
const stub = (obj, name, fn) => { const old = obj[name]; obj[name] = fn; return () => { obj[name] = old; }; };

test("subtotal: price x quantity, bad numbers never make it negative", () => {
  assert.equal(subtotalOf([{ price: 850000, quantity: 2 }, { price: 99.5, quantity: "3" }]), 1700298.5);
  assert.equal(subtotalOf([{ price: -500, quantity: 2 }]), 0);
  assert.equal(subtotalOf([{ price: 100, quantity: 0 }]), 100); // at least 1
});

test("shipping: free from Rs 10,000", () => {
  assert.equal(shippingFor(9999), 99);
  assert.equal(shippingFor(10000), 0);
});

test("coupon: empty, unknown, not started, expired", async (t) => {
  assert.equal((await evaluateCoupon("", 1000)).valid, false);
  let offer = null;
  t.after(stub(Offer, "findOne", () => query(offer)));
  assert.match((await evaluateCoupon("nope", 1000)).message, /isn't valid/);
  offer = { _id: "x", code: "SOON", discountType: "percent", discountValue: 10, startsAt: new Date(Date.now() + 864e5) };
  assert.match((await evaluateCoupon("soon", 1000)).message, /isn't active yet/);
  offer = { _id: "x", code: "OLD", discountType: "percent", discountValue: 10, endsAt: new Date(Date.now() - 1000) };
  assert.match((await evaluateCoupon("old", 1000)).message, /expired/);
});

test("coupon: minimum order, percent cap, flat never more than the order", async (t) => {
  let offer;
  t.after(stub(Offer, "findOne", () => query(offer)));
  offer = { _id: "x", code: "MIN", discountType: "flat", discountValue: 500, minOrderAmount: 5000 };
  const short = await evaluateCoupon("min", 4000);
  assert.equal(short.valid, false);
  assert.match(short.message, /1,000 more/);
  offer = { _id: "x", code: "TEN", discountType: "percent", discountValue: 10, maxDiscount: 20000 };
  assert.equal((await evaluateCoupon("ten", 850000)).discount, 20000); // 10% would be 85,000
  offer = { _id: "x", code: "BIG", discountType: "flat", discountValue: 5000 };
  assert.equal((await evaluateCoupon("big", 3000)).discount, 3000);
  assert.equal((await evaluateCoupon(" big ", 3000)).code, "BIG"); // trimmed, upper case
});

test("order: price always comes from the database, never from the browser", async (t) => {
  t.after(stub(Products, "findById", () => query({ name: "Rotary Tablet Press", price: 850000, active: true })));
  t.after(stub(Offer, "findOne", () => query(null)));
  const order = await priceOrder([{ productId: ID, quantity: 2, price: 1 }], "");
  assert.equal(order.subtotal, 1700000);
  assert.equal(order.items[0].price, 850000);
  assert.equal(order.totalAmount, 1700000); // free shipping
});

test("order: refuses bad ids, bad quantities, unpriced and enquiry-only machines", async (t) => {
  let product = { name: "M", price: 0, active: true };
  t.after(stub(Products, "findById", () => query(product)));
  await assert.rejects(priceOrder([], ""), /cart is empty/);
  await assert.rejects(priceOrder([{ productId: "abc", quantity: 1 }], ""), { status: 400 });
  await assert.rejects(priceOrder([{ productId: ID, quantity: 0 }], ""), /quantities/);
  await assert.rejects(priceOrder([{ productId: ID, quantity: 1 }], ""), /no listed price/);
  product = { name: "M", price: 1000, active: true, sellOnline: false };
  await assert.rejects(priceOrder([{ productId: ID, quantity: 1 }], ""), /enquiry only/);
  product = { name: "M", price: 1000, active: false };
  await assert.rejects(priceOrder([{ productId: ID, quantity: 1 }], ""), /no longer available/);
  await assert.rejects(priceOrder(Array.from({ length: 51 }, () => ({ productId: ID, quantity: 1 })), ""), /up to 50/);
});

test("serial number: model code, India month, running number", async (t) => {
  assert.equal(modelCode("ZP-35D", "tablet-press"), "ZP35D");
  assert.equal(modelCode("", "tablet-press"), "TP");
  assert.equal(modelCode("", ""), "GEN");
  t.after(stub(SerialCounter, "findOneAndUpdate", async () => ({ seq: 7 })));
  // 31 Oct 2026 20:00 UTC is already 1 Nov in India
  assert.equal(await nextSerial({ modelNumber: "NJP 1200", soldAt: new Date("2026-10-31T20:00:00Z") }), "FPM-NJP1200-2611-0007");
});
