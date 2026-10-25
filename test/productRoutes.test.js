// Unit tests: add / update product (src/products/productsroute.js). Login, database and
// IndexNow are replaced with stand-ins; the product model's own checks are real.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");

const fake = (rel, exports) => { const file = require.resolve(path.join("..", "src", rel)); require.cache[file] = { id: file, filename: file, loaded: true, exports }; };
fake("middlewere/authMiddleware.js", {
  verifyToken: (req, res, next) => { req.userId = "admin1"; req.role = "admin"; next(); },
  verifyAdmin: (req, res, next) => next(),
  userFromRequest: () => ({ role: "admin" }),
});
fake("utils/indexnow.js", { pingIndexNow: () => {} });

const Products = require("../src/products/productsmodel");
const Reviews = require("../src/review/reviewsmodel");
Products.prototype.save = async function save() { const err = this.validateSync(); if (err) throw err; return this; };
Reviews.find = async () => [];
let updateArgs = null;
Products.findByIdAndUpdate = async (id, body, options) => {
  updateArgs = { id, body, options };
  const err = new Products({ name: "x", category: "x", description: "x", images: ["x"], color: "x", author: "a".repeat(24), ...body }).validateSync(Object.keys(body));
  if (err && options.runValidators) throw err;
  return { _id: id, ...body };
};

const router = require("../src/products/productsRoute");
const app = express().use(express.json()).use("/api/products", router);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/products`;
test.after(() => server.close());
const send = (method, p, body) => fetch(base + p, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const GOOD = {
  name: "Test Ribbon Blender", category: "mixing", color: "silver", description: "Horizontal ribbon blender.",
  images: ["https://example.com/a.jpg"], author: "a".repeat(24), price: 450000,
  specifications: [{ key: "Working capacity", value: "500 L" }], fitsModels: "ZP-35D, NJP-1200",
};

test("add: a complete product is saved (201)", async () => {
  const res = await send("POST", "/create-product", GOOD);
  assert.equal(res.status, 201);
  const p = await res.json();
  assert.equal(p.name, GOOD.name);
  assert.deepEqual(p.fitsModels, ["ZP-35D", "NJP-1200"]); // comma list split by the model
});

test("add: missing fields and half specifications get a readable 400, not a server error", async () => {
  const { images, ...noImages } = GOOD;
  let res = await send("POST", "/create-product", noImages);
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /Please check: images \(At least one image is required\)/);
  res = await send("POST", "/create-product", { ...GOOD, images: [] }); // was accepted before
  assert.equal(res.status, 400);
  res = await send("POST", "/create-product", { ...GOOD, specifications: [{ key: "Working capacity", value: "" }] });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /specifications\.0\.value \(required\)/);
  res = await send("POST", "/create-product", { ...GOOD, price: -5 });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /price \(too small\)/);
});

test("update: runs the model's checks, and refuses an emptied name with a readable 400", async () => {
  let res = await send("PATCH", `/update-product/${"b".repeat(24)}`, { price: 500000 });
  assert.equal(res.status, 200);
  assert.equal(updateArgs.options.runValidators, true);
  res = await send("PATCH", `/update-product/${"b".repeat(24)}`, { name: "" });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /name \(required\)/);
});
