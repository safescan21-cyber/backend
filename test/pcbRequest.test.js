// Unit tests: PCB repair requests (src/service/serviceRoutes.js). Email, database and Cloudinary
// are replaced with stand-ins; the upload limits and form checks are real.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");

const fake = (rel, exports) => { const file = require.resolve(path.join("..", "src", rel)); require.cache[file] = { id: file, filename: file, loaded: true, exports }; };
const emailed = [];
fake("users/email.js", { sendServiceRequestEmails: (r) => emailed.push(r), sendServiceUpdateEmail: () => {} });
fake("utils/uploadImage.js", {});
fake("middlewere/authMiddleware.js", { verifyToken: (q, s, n) => n(), verifyAdmin: (q, s, n) => n(), optionalAuth: (q, s, n) => n() });

const cloudinary = require("cloudinary").v2;
cloudinary.uploader.upload_stream = (options, cb) => ({ end: () => cb(null, { secure_url: `https://res.cloudinary.com/x/image/upload/${options.folder}/a.jpg` }) });
const ServiceRequest = require("../src/service/ServiceRequest");
ServiceRequest.exists = async () => false;
ServiceRequest.create = async (doc) => ({ _id: "1", ...doc });
ServiceRequest.updateOne = async () => ({});

const app = express().use("/api/service", require("../src/service/serviceRoutes"));
const server = app.listen(0);
test.after(() => server.close());
const url = () => `http://127.0.0.1:${server.address().port}/api/service/requests/pcb`;
const form = (fields, photo) => {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.append(k, v));
  if (photo) f.append("photos", new Blob([new Uint8Array(10)], { type: photo }), "board.jpg");
  return f;
};
const good = { name: "Ravi", phone: "+91 98765 43210", issue: "The board does not power on." };

test("pcb: a complete request saves the photo and emails the business", async () => {
  const res = await fetch(url(), { method: "POST", body: form(good, "image/jpeg") });
  assert.equal(res.status, 201);
  assert.equal(emailed.length, 1);
  assert.equal(emailed[0].type, "pcb");
  assert.match(emailed[0].photos[0], /pcb-repair/);
});

test("pcb: no photo, or a file that is not an image, is refused", async () => {
  assert.equal((await fetch(url(), { method: "POST", body: form(good) })).status, 400);
  assert.equal((await fetch(url(), { method: "POST", body: form(good, "application/pdf") })).status, 400);
});

test("pcb: a filled honeypot is dropped without saving", async () => {
  const before = emailed.length;
  const res = await fetch(url(), { method: "POST", body: form({ ...good, website: "x" }, "image/jpeg") });
  assert.equal(res.status, 201);
  assert.equal(emailed.length, before);
});
