// Factory photos and client installations shown on the website (admin-managed)
//   GET    /api/showcase?kind=photo|client   anyone: active items (client logos only when allowed)
//   GET    /api/showcase/all                 admin: everything
//   POST   /api/showcase                     admin: add
//   PATCH  /api/showcase/:id                 admin: change
//   DELETE /api/showcase/:id                 admin: delete
const router = require("express").Router();
const Showcase = require("./Showcase");
const { SECTIONS } = require("./Showcase");
const { verifyToken, verifyAdmin } = require("../middlewere/authMiddleware");
const { cacheGet, clearOnWrite } = require("../utils/cache");

const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//;

const cleanItem = (b) => {
  const kind = b.kind === "client" ? "client" : "photo";
  const year = parseInt(b.year, 10);
  const imageUrl = clean(b.imageUrl, 500);
  return {
    kind,
    title: clean(b.title, 150),
    section: kind === "photo" && SECTIONS.includes(b.section) ? b.section : "",
    imageUrl: CLOUDINARY.test(imageUrl) ? imageUrl : "",
    city: clean(b.city, 100),
    state: clean(b.state, 100),
    machine: clean(b.machine, 200),
    ...(year >= 1950 && year <= 2100 ? { year } : { year: undefined }),
    showLogo: kind === "client" && Boolean(b.showLogo),
    active: b.active !== false,
    order: Math.floor(Number(b.order) || 0),
  };
};

router.get("/", cacheGet(60000), async (req, res) => {
  try {
    const kind = req.query.kind === "client" ? "client" : "photo";
    const items = await Showcase.find({ kind, active: true }).sort({ order: 1, createdAt: -1 }).limit(500).lean();
    // A client's logo is public only when they agreed to it
    res.json({ items: items.map((i) => (i.kind === "client" && !i.showLogo ? { ...i, imageUrl: "" } : i)) });
  } catch (error) {
    res.status(500).json({ message: "Could not load" });
  }
});

router.get("/all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    res.json({ items: await Showcase.find().sort({ kind: 1, order: 1, createdAt: -1 }).limit(1000).lean() });
  } catch (error) {
    res.status(500).json({ message: "Could not load" });
  }
});

router.post("/", verifyToken, verifyAdmin, clearOnWrite, async (req, res) => {
  try {
    const item = cleanItem(req.body || {});
    if (item.kind === "photo" && !item.imageUrl) return res.status(400).json({ message: "Upload a photo first." });
    if (item.kind === "client" && !item.title) return res.status(400).json({ message: "Enter the client's name." });
    res.status(201).json({ item: await Showcase.create(item) });
  } catch (error) {
    res.status(500).json({ message: "Could not save" });
  }
});

router.patch("/:id", verifyToken, verifyAdmin, clearOnWrite, async (req, res) => {
  try {
    const item = cleanItem(req.body || {});
    const saved = await Showcase.findByIdAndUpdate(req.params.id, item, { returnDocument: "after" }).catch(() => null);
    if (!saved) return res.status(404).json({ message: "Not found" });
    res.json({ item: saved });
  } catch (error) {
    res.status(500).json({ message: "Could not save" });
  }
});

router.delete("/:id", verifyToken, verifyAdmin, clearOnWrite, async (req, res) => {
  try {
    const gone = await Showcase.findByIdAndDelete(req.params.id).catch(() => null);
    if (!gone) return res.status(404).json({ message: "Not found" });
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: "Could not delete" });
  }
});

module.exports = router;
