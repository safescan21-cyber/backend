// Unit tests: login checks on protected routes and the request limiter. Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret-for-unit-tests";
const { verifyToken, verifyAdmin, optionalAuth } = require("../src/middlewere/authMiddleware");
const { tooMany } = require("../src/utils/rateLimit");

// Minimal Express req/res stand-ins
const run = (mw, init) => new Promise((resolve) => {
  const req = { headers: {}, cookies: {}, ...init };
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { resolve({ status: this.statusCode, body: b, req }); } };
  mw(req, res, () => resolve({ status: "next", req }));
});
const sign = (payload, opts) => jwt.sign(payload, process.env.JWT_SECRET, opts);
const quiet = (t) => { const e = console.error; console.error = () => {}; t.after(() => { console.error = e; }); };

test("protected route: no token, forged token, expired token are refused", async (t) => {
  quiet(t);
  assert.equal((await run(verifyToken, {})).status, 401);
  const forged = jwt.sign({ userId: "u1", role: "admin" }, "someone-elses-secret");
  assert.equal((await run(verifyToken, { headers: { authorization: `Bearer ${forged}` } })).status, 401);
  const expired = sign({ userId: "u1", role: "user" }, { expiresIn: -10 });
  const r = await run(verifyToken, { headers: { authorization: `Bearer ${expired}` } });
  assert.equal(r.status, 401);
  assert.match(r.body.message, /expired/);
});

test("protected route: a valid token passes, and a stale cookie doesn't block it", async (t) => {
  quiet(t);
  const good = sign({ userId: "u1", role: "user" });
  const r = await run(verifyToken, { cookies: { token: "stale" }, headers: { authorization: `Bearer ${good}` } });
  assert.equal(r.status, "next");
  assert.equal(r.req.userId, "u1");
});

test("admin route: only role admin passes", async () => {
  assert.equal((await run(verifyAdmin, {})).status, 403);
  assert.equal((await run(verifyAdmin, { role: "user" })).status, 403);
  assert.equal((await run(verifyAdmin, { role: "admin" })).status, "next");
});

test("optional login: never blocks, even with a bad token", async () => {
  assert.equal((await run(optionalAuth, { headers: { authorization: "Bearer junk" } })).status, "next");
});

test("rate limit: the request after the limit is refused, other visitors are not", () => {
  const key = `test:${Date.now()}`;
  for (let i = 0; i < 3; i++) assert.equal(tooMany(key, 3, 60000), false);
  assert.equal(tooMany(key, 3, 60000), true);
  assert.equal(tooMany(`${key}:other`, 3, 60000), false);
});
