// Unit tests: nearest city for Nova's "use my exact location" (src/geo/geoRoutes.js)
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const app = express().use(express.json()).use("/api/geo", require("../src/geo/geoRoutes"));
const server = app.listen(0);
test.after(() => server.close());
const near = async (lat, lon) => {
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/geo/near`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat, lon }) });
  const body = await res.json();
  return body.city && `${body.city}, ${body.region}`;
};

test("geo: a position in India gives the nearest city, without accents", async () => {
  assert.equal(await near(29.945, 78.164), "Haridwar, UT");
  assert.equal(await near(29.39, 76.97), "Panipat, HR");
});

test("geo: outside India or bad input gives no city", async () => {
  assert.equal(await near(51.5, -0.12), "");
  assert.equal(await near("x", null), "");
});
