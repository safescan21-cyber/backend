// Unit tests: admin roles on Dashboard → Users (src/users/userroute.js). Login and the
// database are replaced with stand-ins: several admins are fine, the last one is protected.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");

const fake = (rel, exports) => { const file = require.resolve(path.join("..", "src", rel)); require.cache[file] = { id: file, filename: file, loaded: true, exports }; };
fake("middlewere/authMiddleware.js", {
  verifyToken: (req, res, next) => { req.userId = "me"; req.role = "admin"; next(); },
  verifyAdmin: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
  userFromRequest: () => ({ role: "admin" }),
});

const User = require("../src/users/Usermodel");
let users;
const lean = (v) => ({ select() { return this; }, lean: async () => v });
User.findById = (id) => lean(users.find((u) => u._id === id) || null);
User.countDocuments = async (q) => users.filter((u) => !q?.role || u.role === q.role).length;
User.findByIdAndUpdate = (id, upd) => {
  const u = users.find((x) => x._id === id);
  if (u) Object.entries(upd).forEach(([k, v]) => { if (v !== undefined) u[k] = v; });
  return { select: async () => (u ? { ...u, toObject: () => u } : null) };
};
User.findByIdAndDelete = async (id) => { const i = users.findIndex((u) => u._id === id); return i < 0 ? null : users.splice(i, 1)[0]; };

const router = require("../src/users/userroute");
const app = express().use(express.json()).use("/api/auth", router);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/auth`;
test.after(() => server.close());
const call = (method, p, body) => fetch(base + p, { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });

test("more than one admin: a user can be made admin, and an admin made user while another remains", async () => {
  users = [{ _id: "me", role: "admin", email: "a@x.in" }, { _id: "u2", role: "user", email: "b@x.in" }];
  assert.equal((await call("PUT", "/users/u2", { role: "admin" })).status, 200);
  assert.equal(users.filter((u) => u.role === "admin").length, 2);
  assert.equal((await call("PUT", "/users/u2", { role: "user" })).status, 200);
});

test("the last admin can't be made user or deleted; nobody deletes their own account", async () => {
  users = [{ _id: "me", role: "admin", email: "a@x.in" }, { _id: "a2", role: "admin", email: "c@x.in" }, { _id: "u2", role: "user", email: "b@x.in" }];
  assert.equal((await call("DELETE", "/users/me")).status, 400);
  assert.equal((await call("DELETE", "/users/a2")).status, 200); // another admin remains
  const res = await call("PUT", "/users/me", { role: "user" });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /only admin/);
  assert.equal((await call("PUT", "/users/u2", { role: "superadmin" })).status, 400);
});
