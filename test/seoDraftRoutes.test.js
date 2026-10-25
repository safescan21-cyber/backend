// Unit tests: approve / reject routes for model-drafted Google descriptions
// (src/seo/seoAuditRoutes.js). Login, database and IndexNow are replaced with stand-ins.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");

// Stand-ins, put in Node's module cache before the routes load them
const fake = (rel, exports) => { const file = require.resolve(path.join("..", "src", rel)); require.cache[file] = { id: file, filename: file, loaded: true, exports }; };
let role = "admin";
fake("middlewere/authMiddleware.js", {
  verifyToken: (req, res, next) => { req.userId = "admin1"; req.role = role; next(); },
  verifyAdmin: (req, res, next) => (req.role === "admin" ? next() : res.status(403).json({ message: "Admin access required" })),
});
const pinged = [];
fake("utils/indexnow.js", { pingIndexNow: (urls) => pinged.push(...urls) });

const Products = require("../src/products/productsmodel");
const { MetaDraft } = require("../src/seo/metaDrafts");
const router = require("../src/seo/seoAuditRoutes");

const ID = "a".repeat(24);
const PRODUCT = "6ad20d0d5d94effd760752d6";
const TEXT = "Rotary tablet press with 16 stations and double-sided compression for pharmaceutical and nutraceutical tablets.";
let draft;
let updated = null;
MetaDraft.findById = async (id) => (draft && id === ID ? draft : null);
Products.findByIdAndUpdate = (id, update) => { updated = { id: String(id), ...update.$set }; return { select() { return this; }, lean: async () => ({ _id: PRODUCT }) }; };

const app = express().use(express.json()).use("/api/seo", router);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());
const post = (p, body) => fetch(`${base}/api/seo${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
const fresh = () => { draft = { product: PRODUCT, draft: TEXT, status: "pending", save: async () => {} }; updated = null; pinged.length = 0; };

test("approve: saves the (edited) text on the machine and tells IndexNow", async () => {
  fresh();
  const res = await post(`/drafts/${ID}/approve`, { text: `  ${TEXT}  ` });
  assert.equal(res.status, 200);
  assert.deepEqual(updated, { id: PRODUCT, metaDescription: TEXT });
  assert.equal(draft.status, "approved");
  assert.deepEqual(pinged, [`/shop/${PRODUCT}`]);
});

test("approve: refuses text too short, too long or with links, and changes nothing", async () => {
  for (const text of ["Too short.", "x".repeat(161), `${TEXT} See www.example.com`]) {
    fresh();
    const res = await post(`/drafts/${ID}/approve`, { text });
    assert.equal(res.status, 400, text.slice(0, 30));
    assert.equal(updated, null);
    assert.equal(draft.status, "pending");
  }
});

test("reject: the machine is not touched", async () => {
  fresh();
  assert.equal((await post(`/drafts/${ID}/reject`)).status, 200);
  assert.equal(draft.status, "rejected");
  assert.equal(updated, null);
});

test("decided or unknown drafts and non-admins are refused", async () => {
  fresh();
  draft.status = "approved";
  assert.equal((await post(`/drafts/${ID}/approve`)).status, 404);
  assert.equal((await post(`/drafts/${"b".repeat(24)}/reject`)).status, 404);
  assert.equal((await post("/drafts/not-an-id/approve")).status, 404);
  role = "user";
  fresh();
  assert.equal((await post(`/drafts/${ID}/approve`)).status, 403);
  role = "admin";
});
