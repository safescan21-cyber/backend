// Unit tests: Google description drafts by our model (src/seo/metaDrafts.js). Run: npm test
// The model and the database are replaced with stand-ins.
const test = require("node:test");
const assert = require("node:assert/strict");
const Products = require("../src/products/productsmodel");
const { MetaDraft, runMetaDrafts, checkDraft, reasonFor, promptFacts } = require("../src/seo/metaDrafts");

const PRESS = {
  _id: "6ad20d0d5d94effd760752d6", name: "Rotary Tablet Press – 16 Station (D Tooling)", category: "tablet-press", price: 850000, warranty: 24, stock: 2,
  specifications: [{ key: "Stations", value: "16 (D tooling)" }, { key: "Output", value: "Up to 28,800 tablets/hour" }],
  description: "High-output rotary tablet press for pharmaceutical and nutraceutical tablets with double-sided compression and touchscreen HMI for production batches. Video: Some One, CC BY-SA 4.0, via Wikimedia Commons.",
};
const GOOD = "Rotary tablet press with 16 stations and double-sided compression, up to 28,800 tablets/hour for pharmaceutical and nutraceutical tablets.";

test("check: a factual sentence of the right length passes", () => {
  assert.deepEqual(checkDraft(`"${GOOD}"`, PRESS), { ok: true, text: GOOD });
});

test("check: invented numbers, prices, claims, links and chat are refused", () => {
  const no = (text, why) => { const r = checkDraft(text, PRESS); assert.equal(r.ok, false, text); assert.match(r.problem, why); };
  no("Rotary tablet press with 45 stations and double-sided compression for pharmaceutical and nutraceutical tablets in production.", /numbers not in/);
  no("Rotary tablet press with 16 stations, listed at Rs. 8,50,000 ex-works, for pharmaceutical and nutraceutical tablet production.", /price|talks/);
  no("The best rotary tablet press with 16 stations and double-sided compression for pharmaceutical and nutraceutical tablets.", /claim/);
  no("Rotary tablet press with 16 stations for pharma tablets; see www.example.com for the full details and the latest offers.", /link/);
  no("The Rotary Tablet Press you're asking about has 16 stations and double-sided compression for pharmaceutical tablets.", /talks/);
  no("Rotary tablet press with 16 stations and double-sided compression, up to 28,800 tablets/hour. Here are the key details:", /talks|finished/);
  no("Rotary tablet press, double-sided compression, 16 stations, up to 28,800 tablets/hour, double-sided compression.", /repeats/);
  no("Tablet machine.", /too short/);
  no("Coating pan for sugar and film coating of tablets with a perforated drum and spray guns for pharma and food plants.", /name the machine/);
});

test("check: a draft a little too long is cut at a comma and finished", () => {
  const long = `${GOOD.replace(/\.$/, "")}, with touchscreen HMI and double-sided compression for production batches in pharma plants.`;
  const r = checkDraft(long, PRESS);
  assert.equal(r.ok, true);
  assert.ok(r.text.length <= 160 && r.text.endsWith("."));
});

test("reason: cut off, too short, copied, or fine once a good description is approved", () => {
  const other = { ...PRESS, _id: "b".repeat(24), name: "Other press" };
  assert.match(reasonFor(PRESS, [PRESS]), /cut off/);
  assert.equal(reasonFor({ ...PRESS, description: "Tablet press." }, [PRESS]), "too short");
  assert.equal(reasonFor({ ...PRESS, description: "" }, [PRESS]), "missing");
  assert.equal(reasonFor(PRESS, [PRESS, other]), "same as another machine");
  assert.equal(reasonFor({ ...PRESS, metaDescription: GOOD }, [PRESS]), "");
});

test("the model gets no price, stock or photo credits", () => {
  const f = promptFacts(PRESS);
  assert.doesNotMatch(f, /850|Rs\.|stock|warranty|Wikimedia|Video/i);
  assert.match(f, /Stations: 16/);
});

test("run: drafts only what needs it, keeps passing drafts, skips after 3 failed tries", async (t) => {
  const fine = { ...PRESS, _id: "c".repeat(24), name: "Fine machine", metaDescription: "Fine machine with a good approved description that is long enough for Google and unique to it." };
  const bad = { ...PRESS, _id: "d".repeat(24), name: "Capsule Filler NJP 800", specifications: [], description: "Capsule filler. ".repeat(20) };
  const q = (v) => ({ select() { return this; }, sort() { return this; }, lean: async () => v });
  const saved = [];
  const old = [Products.find, MetaDraft.find, MetaDraft.create];
  Products.find = () => q([PRESS, fine, bad]);
  MetaDraft.find = () => q([]);
  MetaDraft.create = async (d) => { saved.push(d); return d; };
  t.after(() => { [Products.find, MetaDraft.find, MetaDraft.create] = old; });
  let asked = 0;
  const ask = async (facts) => { asked++; return facts.includes("Rotary") ? GOOD : "I'm sorry, but I can't assist with that."; };
  const r = await runMetaDrafts({ ask });
  assert.equal(r.drafted, 1);
  assert.equal(saved[0].draft, GOOD);
  assert.equal(r.skipped.length, 1);
  assert.equal(asked, 1 + 3); // the fine machine is never sent to the model
});
