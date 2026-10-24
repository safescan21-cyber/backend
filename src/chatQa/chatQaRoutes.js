// Chatbot training data (Dashboard → Chatbot Training)
//   GET    /api/chat-qa                 anyone: active questions + answers (they are answers the
//                                       chat gives customers anyway; read by the website's chat
//                                       and by llm-training/export_dataset.mjs)
//   GET    /api/chat-qa/all             admin: every Q&A
//   POST   /api/chat-qa                 admin: add      PATCH/DELETE /api/chat-qa/:id  admin
//   GET    /api/chat-qa/missed          admin: questions the chat couldn't answer
//   PATCH  /api/chat-qa/missed/:id      admin: mark answered / dismissed
//   POST   /api/chat-qa/missed          the website's chat route only (X-Chat-Log-Key = CHAT_LOG_KEY)
const router = require("express").Router();
const crypto = require("crypto");
const { ChatQa, ChatMissed } = require("./ChatQa");
const { verifyToken, verifyAdmin } = require("../middlewere/authMiddleware");
const { cacheGet, clearOnWrite } = require("../utils/cache");

router.use(clearOnWrite);
const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const MAX_MISSED = 1000; // oldest ones are dropped beyond this

router.get("/", cacheGet(60000), async (req, res) => {
  try {
    const items = await ChatQa.find({ active: true }).select("question answer updatedAt").sort({ updatedAt: -1 }).limit(2000).lean();
    res.json({ items });
  } catch (error) {
    res.json({ items: [] }); // the chat must keep working
  }
});

router.get("/all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    res.json({ items: await ChatQa.find().sort({ updatedAt: -1 }).limit(5000).lean() });
  } catch (error) {
    res.status(500).json({ message: "Could not load the questions" });
  }
});

router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const question = clean(req.body?.question, 300);
    const answer = String(req.body?.answer ?? "").trim().slice(0, 2000);
    if (!question || !answer) return res.status(400).json({ message: "Write both the question and the answer." });
    const item = await ChatQa.create({ question, answer, active: req.body?.active !== false, createdBy: String(req.userId || "") });
    // Answering a logged question closes it
    if (req.body?.missedId && /^[a-f0-9]{24}$/i.test(req.body.missedId)) {
      await ChatMissed.updateOne({ _id: req.body.missedId }, { $set: { status: "answered" } });
    }
    res.status(201).json({ item });
  } catch (error) {
    res.status(500).json({ message: "Could not save" });
  }
});

router.patch("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const set = {};
    if (typeof req.body?.question === "string") set.question = clean(req.body.question, 300);
    if (typeof req.body?.answer === "string") set.answer = req.body.answer.trim().slice(0, 2000);
    if (typeof req.body?.active === "boolean") set.active = req.body.active;
    if (set.question === "" || set.answer === "") return res.status(400).json({ message: "Question and answer can't be empty." });
    const item = await ChatQa.findByIdAndUpdate(req.params.id, { $set: set }, { returnDocument: "after", runValidators: true }).lean().catch(() => null);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({ item });
  } catch (error) {
    res.status(500).json({ message: "Could not save" });
  }
});

router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const r = await ChatQa.deleteOne({ _id: req.params.id }).catch(() => ({ deletedCount: 0 }));
    if (!r.deletedCount) return res.status(404).json({ message: "Not found" });
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: "Could not delete" });
  }
});

// ── Questions the chat couldn't answer ──
const keyOk = (req) => {
  const want = process.env.CHAT_LOG_KEY || "";
  const got = String(req.headers["x-chat-log-key"] || "");
  return want.length >= 16 && got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
};
// Remove contact details before anything is stored
const scrub = (text) => clean(text, 300)
  .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
  .replace(/\+?\d[\d\s-]{7,}\d/g, "[number]");
const keyOf = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);

router.post("/missed", async (req, res) => {
  try {
    if (!keyOk(req)) return res.status(404).json({ message: "Not found" });
    const text = scrub(req.body?.question);
    const key = keyOf(text);
    if (key.length < 3) return res.json({ ok: true });
    await ChatMissed.updateOne(
      { key },
      { $setOnInsert: { key, text, status: "open" }, $inc: { count: 1 }, $set: { lastAt: new Date() } },
      { upsert: true }
    ).catch((err) => { if (err.code !== 11000) throw err; });
    const total = await ChatMissed.estimatedDocumentCount();
    if (total > MAX_MISSED) {
      const old = await ChatMissed.find().sort({ lastAt: 1 }).limit(total - MAX_MISSED).select("_id").lean();
      await ChatMissed.deleteMany({ _id: { $in: old.map((o) => o._id) } });
    }
    res.json({ ok: true });
  } catch (error) {
    res.json({ ok: false });
  }
});

router.get("/missed", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const status = ["open", "answered", "dismissed"].includes(req.query.status) ? req.query.status : "open";
    res.json({ items: await ChatMissed.find({ status }).sort({ count: -1, lastAt: -1 }).limit(300).lean() });
  } catch (error) {
    res.status(500).json({ message: "Could not load" });
  }
});

router.patch("/missed/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (!["open", "answered", "dismissed"].includes(req.body?.status)) return res.status(400).json({ message: "Unknown status" });
    const item = await ChatMissed.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { returnDocument: "after" }).lean().catch(() => null);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({ item });
  } catch (error) {
    res.status(500).json({ message: "Could not save" });
  }
});

module.exports = router;
