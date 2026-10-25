// Google descriptions (meta descriptions) for shop machines, drafted by our own model.
// Every Monday after the SEO check (seoAudit.js), each active machine whose description is
// missing, cut off, too short or a copy of another machine's gets a draft written from its
// real data. Drafts only go live when an admin approves them (Dashboard → SEO Health):
// approved text is saved as the machine's metaDescription and sent to IndexNow.
// The model: llama.cpp on this server (LLM_BASE_URL, default http://127.0.0.1:8090/v1).
const mongoose = require("mongoose");
const Products = require("../products/productsmodel");

const MetaDraft = mongoose.models.MetaDraft || mongoose.model("MetaDraft", new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  name: String,
  current: String, // what Google got before
  draft: { type: String, required: true },
  reason: String,
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  decidedAt: Date,
  decidedBy: String,
}, { timestamps: true, collection: "seo_meta_drafts" }));

const MIN = 70;
const MAX = 160;
const plain = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);
const digits = (s) => String(s).replace(/\D/g, "");

// The description Google gets today (same rule as frontend-next/src/seo/pageSeo.js)
const currentMeta = (p) => p.metaDescription || clip(plain(p.description), 158);

// Why a machine needs a new description, or "" when it doesn't
const reasonFor = (p, all) => {
  if (p.metaDescription) {
    const m = p.metaDescription.trim();
    if (m.length >= MIN && m.length <= MAX && !all.some((o) => String(o._id) !== String(p._id) && o.metaDescription === m)) return "";
  }
  const text = plain(p.description);
  if (!text) return "missing";
  const start = currentMeta(p).slice(0, 90).toLowerCase();
  if (all.some((o) => String(o._id) !== String(p._id) && currentMeta(o).slice(0, 90).toLowerCase() === start)) return "same as another machine";
  if (text.length > MAX) return "cut off in Google (description longer than 160 characters)";
  if (text.length < MIN) return "too short";
  return "";
};

// The machine's real data, the only thing the model may use
const factsOf = (p) => [
  `Machine: ${p.name}`,
  p.category && `Category: ${String(p.category).replace(/-/g, " ")}`,
  p.modelNumber && `Model: ${p.modelNumber}`,
  p.manufacturer && `Manufacturer: ${p.manufacturer}`,
  p.origin && `Origin: ${p.origin}`,
  Number(p.price) > 0 && `Listed price: Rs. ${Number(p.price).toLocaleString("en-IN")} ex-works`,
  Number(p.warranty) > 0 && `Warranty: ${p.warranty} months`,
  Number(p.stock) > 0 ? "In stock" : "Made to order",
  ...(p.specifications || []).filter((s) => s?.key && s?.value).slice(0, 6).map((s) => `${s.key}: ${s.value}`),
  `About: ${clip(plain(p.description), 400)}`,
].filter(Boolean).join("\n");

// What the machine is, without photo/video credits or test notes left in some descriptions
const about = (p) => (plain(p.description).match(/[^.!?]+[.!?]+/g) || [plain(p.description)])
  .filter((s) => !/video:|photo:|cc by|wikimedia|shown to test|demo|not for sale/i.test(s)).slice(0, 2).join(" ").trim();

// The short version the model writes from (all facts make it list everything, price included);
// numbers in the draft are still checked against all the facts above
const promptFacts = (p) => [
  `Machine: ${p.name}`,
  p.category && `Category: ${String(p.category).replace(/-/g, " ")}`,
  (p.specifications || []).filter((s) => s?.key && s?.value).slice(0, 3).map((s) => `${s.key}: ${s.value}`).join("; ") && `Specifications: ${(p.specifications || []).filter((s) => s?.key && s?.value).slice(0, 3).map((s) => `${s.key}: ${s.value}`).join("; ")}`,
  `About: ${about(p)}`,
].filter(Boolean).join("\n");

// A draft a little over the limit: cut where a new part of the sentence starts (", with",
// ", for", ", up to"…), never inside a list, and end the sentence there
const fitLength = (text) => {
  if (text.length <= MAX) return text;
  const cut = text.slice(0, MAX);
  const starts = [...cut.matchAll(/,? (with|for|using|up to|ideal for|designed for) /g)].map((m) => m.index).filter((i) => i >= 90);
  return starts.length ? `${cut.slice(0, starts[starts.length - 1]).replace(/[,;:\s]+$/, "")}.` : text;
};

const BANNED = /\b(best|cheapest|no\.?\s?1|number one|#1|guarantee[ds]?|leading|top[- ]rated|world[- ]class|unbeatable)\b/i;
const CHATTY = /meta description|here is|here's|here are|key details|facts|as an ai|\bi\b|\bi'm\b|sure[,!]|\byou('re| are)\b|asking|listed|sorry|website/i;

// Cleans a draft and checks it; → { ok, text, problem }
const checkDraft = (raw, p) => {
  let text = String(raw || "").split("\n").map((l) => l.trim()).filter(Boolean)[0] || "";
  text = fitLength(text.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").replace(/\s+/g, " ").trim());
  const facts = factsOf(p);
  const fail = (problem) => ({ ok: false, text, problem });
  if (text.length < MIN) return fail(`too short (${text.length} characters)`);
  if (text.length > MAX) return fail(`too long (${text.length} characters)`);
  if (/https?:|www\.|@|\+?\d[\d\s-]{8,}\d/.test(text)) return fail("contains a link, email or phone number");
  if (BANNED.test(text)) return fail("makes a claim (best, leading, guaranteed…)");
  if (/\brs\.?\s?\d|₹|\bprice|ex-works|warranty|in stock|out of stock|video|demo/i.test(text)) return fail("mentions price, stock or test notes (they change; keep them on the page)");
  if (CHATTY.test(text)) return fail("talks about the task instead of the machine");
  if (!/[.!]$/.test(text)) return fail("not a finished sentence");
  const parts = text.toLowerCase().replace(/[.!]$/, "").split(/,\s*|\s+and\s+/).map((s) => s.trim()).filter((s) => s.includes(" "));
  if (new Set(parts).size < parts.length) return fail("repeats itself");
  const nameWords = String(p.name).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  // at least two words of its name (one shared word like "tablet" is not enough)
  if (nameWords.filter((w) => text.toLowerCase().includes(w)).length < Math.min(2, nameWords.length)) return fail("does not name the machine");
  const known = new Set((facts.match(/\d[\d,.]*/g) || []).map(digits));
  const unknown = (text.match(/\d[\d,.]*/g) || []).map(digits).filter((d) => d && !known.has(d));
  if (unknown.length) return fail(`uses numbers not in the machine's data (${unknown.join(", ")})`);
  return { ok: true, text };
};

const SYSTEM = "You write Google search descriptions for machines sold by Food Pharma Machinery (Haridwar, India). " +
  "Write ONE sentence of 110 to 155 characters that says what the machine is and what it does, using only the facts given. " +
  "No prices, no phone numbers, no links, no brand or company names, no claims like best or leading. Reply with the sentence only.";
// Two worked examples (machines we don't list), so the model copies the form, not the facts
const EXAMPLES = [
  ["Machine: Ribbon Blender – 500 L\nCategory: mixing\nSpecifications: Working capacity: 500 L; Contact parts: SS 316\nAbout: Horizontal ribbon blender for uniform mixing of dry powders and granules in food and pharma plants.",
    "Ribbon blender with 500 L working capacity and SS 316 contact parts for uniform mixing of dry powders and granules in food and pharma plants."],
  ["Machine: Automatic Sticker Labelling Machine\nCategory: labeling\nSpecifications: Speed: Up to 120 bottles/min\nAbout: Wrap-around labelling of round bottles and jars with batch coding.",
    "Automatic sticker labelling machine for wrap-around labels on round bottles and jars, up to 120 bottles/min, with batch coding."],
];

const askModel = async (facts) => {
  const base = (process.env.LLM_BASE_URL || "http://127.0.0.1:8090/v1").replace(/\/$/, "");
  const messages = [{ role: "system", content: SYSTEM }, ...EXAMPLES.flatMap(([q, a]) => [{ role: "user", content: q }, { role: "assistant", content: a }]), { role: "user", content: facts }];
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // lora scale 0: the plain base model for this request (our chat training makes it chat)
    body: JSON.stringify({ model: process.env.LLM_MODEL || "foodpharma", lora: [{ id: 0, scale: 0 }], messages, max_tokens: 90, temperature: 0.4 }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`model answered ${res.status}`);
  return (await res.json())?.choices?.[0]?.message?.content || "";
};

// Drafts for every machine that needs one (and has no pending draft) → { checked, drafted, skipped[] }
const runMetaDrafts = async ({ ask = askModel, tries = 3 } = {}) => {
  const all = await Products.find({ active: { $ne: false } }).select("name description metaDescription category modelNumber manufacturer origin price warranty stock specifications").lean();
  const pending = new Set((await MetaDraft.find({ status: "pending" }).select("product").lean()).map((d) => String(d.product)));
  const out = { checked: all.length, drafted: 0, skipped: [] };
  for (const p of all) {
    const reason = reasonFor(p, all);
    if (!reason || pending.has(String(p._id))) continue;
    let result = null;
    for (let i = 0; i < tries && !result?.ok; i++) {
      try { result = checkDraft(await ask(promptFacts(p)), p); } catch (err) { result = { ok: false, problem: err.message }; }
    }
    if (!result?.ok) { out.skipped.push({ name: p.name, problem: result?.problem }); continue; }
    await MetaDraft.create({ product: p._id, name: p.name, current: currentMeta(p), draft: result.text, reason });
    out.drafted++;
  }
  return out;
};

module.exports = { MetaDraft, runMetaDrafts, checkDraft, reasonFor, currentMeta, factsOf, promptFacts, MIN, MAX, _askModel: askModel };
