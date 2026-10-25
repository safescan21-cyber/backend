// SEO health (admin)
//   POST /api/seo/audit            check every sitemap page now → results (about a minute)
//   POST /api/seo/audit?email=1    same, and email the report
const router = require("express").Router();
const { verifyToken, verifyAdmin } = require("../middlewere/authMiddleware");
const { runAudit, emailReport, reportTo } = require("./seoAudit");

let running = null; // one check at a time

router.post("/audit", verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (!running) running = runAudit().finally(() => { running = null; });
    const r = await running;
    let emailed = false;
    if (req.query.email === "1") {
      try { await emailReport(r); emailed = true; } catch (err) { console.error("SEO report email failed:", err.message); }
    }
    const { allUrls, ...rest } = r;
    res.json({ ...rest, emailed, reportTo: reportTo() });
  } catch (error) {
    console.error("SEO audit failed:", error.message);
    res.status(500).json({ message: "Could not run the SEO check" });
  }
});

// ── Google descriptions for machines, drafted by our model (src/seo/metaDrafts.js) ──
//   GET  /api/seo/drafts               pending drafts + the last decided ones
//   POST /api/seo/drafts/run           draft now for machines that need one (a minute or two)
//   POST /api/seo/drafts/:id/approve   { text? } → saved on the machine, sent to IndexNow
//   POST /api/seo/drafts/:id/reject
const Products = require("../products/productsmodel");
const { MetaDraft, runMetaDrafts, MAX } = require("./metaDrafts");
const { pingIndexNow } = require("../utils/indexnow");

let drafting = null;

router.get("/drafts", verifyToken, verifyAdmin, async (req, res) => {
  const [pending, decided] = await Promise.all([
    MetaDraft.find({ status: "pending" }).sort({ createdAt: -1 }).lean(),
    MetaDraft.find({ status: { $ne: "pending" } }).sort({ decidedAt: -1 }).limit(20).lean(),
  ]);
  res.json({ pending, decided });
});

router.post("/drafts/run", verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (!drafting) drafting = runMetaDrafts().finally(() => { drafting = null; });
    res.json(await drafting);
  } catch (error) {
    console.error("Meta drafts failed:", error.message);
    res.status(500).json({ message: "Could not write drafts (is the model running?)" });
  }
});

router.post("/drafts/:id/approve", verifyToken, verifyAdmin, async (req, res) => {
  const draft = /^[a-f0-9]{24}$/i.test(req.params.id) ? await MetaDraft.findById(req.params.id) : null;
  if (!draft || draft.status !== "pending") return res.status(404).json({ message: "This draft is no longer waiting" });
  // The admin may edit it: same length limit, and never links or contact details
  const text = String(req.body?.text ?? draft.draft).replace(/\s+/g, " ").trim();
  if (text.length < 50 || text.length > MAX) return res.status(400).json({ message: `Keep it between 50 and ${MAX} characters (now ${text.length}).` });
  if (/https?:|www\.|@/.test(text)) return res.status(400).json({ message: "Please leave out links and email addresses." });
  const product = await Products.findByIdAndUpdate(draft.product, { $set: { metaDescription: text } }, { new: true }).select("_id").lean();
  if (!product) return res.status(404).json({ message: "This machine no longer exists" });
  Object.assign(draft, { draft: text, status: "approved", decidedAt: new Date(), decidedBy: req.userId });
  await draft.save();
  pingIndexNow([`/shop/${product._id}`]);
  res.json({ success: true, draft });
});

router.post("/drafts/:id/reject", verifyToken, verifyAdmin, async (req, res) => {
  const draft = /^[a-f0-9]{24}$/i.test(req.params.id) ? await MetaDraft.findById(req.params.id) : null;
  if (!draft || draft.status !== "pending") return res.status(404).json({ message: "This draft is no longer waiting" });
  Object.assign(draft, { status: "rejected", decidedAt: new Date(), decidedBy: req.userId });
  await draft.save();
  res.json({ success: true });
});

module.exports = router;
