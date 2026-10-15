// GET    /api/offers/active   public: offers running right now (for the home page)
// GET    /api/offers          admin: all offers
// POST   /api/offers          admin: create
// PUT    /api/offers/:id      admin: update
// DELETE /api/offers/:id      admin: delete
const router = require("express").Router();
const Offer = require("./Offer");
const { verifyToken, verifyAdmin } = require("../middlewere/authMiddleware");
const { evaluateCoupon } = require("./coupon");

const FIELDS = ["title", "subtitle", "discountText", "code", "ctaText", "ctaLink", "theme", "startsAt", "endsAt", "isActive", "priority",
  "discountType", "discountValue", "minOrderAmount", "maxDiscount"];

const pick = (body) => {
  const out = {};
  for (const f of FIELDS) if (body[f] !== undefined) out[f] = body[f];
  if (out.endsAt === "" || out.endsAt === null) out.endsAt = null;
  if (out.startsAt === "" || out.startsAt === null) out.startsAt = new Date();
  // Only allow site-relative links or http(s) links
  if (out.ctaLink && !/^(\/|https?:\/\/)/i.test(out.ctaLink)) out.ctaLink = `/${out.ctaLink}`;
  return out;
};

// POST /api/offers/validate-code { code, subtotal } — checkout "Apply" button.
// The final discount is always recalculated when the order is saved.
router.post("/validate-code", async (req, res) => {
  try {
    const subtotal = Math.max(0, Number(req.body?.subtotal) || 0);
    const result = await evaluateCoupon(req.body?.code, subtotal);
    res.status(200).json({ valid: result.valid, discount: result.discount, code: result.code, label: result.label, message: result.message });
  } catch (error) {
    console.error("Coupon check error:", error);
    res.status(500).json({ valid: false, discount: 0, message: "Couldn't check the code right now. Please try again." });
  }
});

router.get("/active", async (req, res) => {
  try {
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      startsAt: { $lte: now },
      $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gt: now } }],
    })
      .sort({ priority: -1, createdAt: -1 })
      .limit(3)
      .lean();
    res.set("Cache-Control", "public, max-age=60");
    res.json({ offers });
  } catch (error) {
    console.error("Active offers error:", error);
    res.json({ offers: [] }); // the home page must still load
  }
});

router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    res.json({ offers: await Offer.find().sort({ createdAt: -1 }).lean() });
  } catch (error) {
    res.status(500).json({ message: "Failed to load offers" });
  }
});

router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const offer = await Offer.create(pick(req.body));
    res.status(201).json({ offer });
  } catch (error) {
    res.status(400).json({ message: error.name === "ValidationError" ? error.message : "Failed to create offer" });
  }
});

router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true }).catch((e) => {
      if (e.name === "ValidationError") throw e;
      return null;
    });
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.json({ offer });
  } catch (error) {
    res.status(400).json({ message: error.name === "ValidationError" ? error.message : "Failed to update offer" });
  }
});

router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id).catch(() => null);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.json({ message: "Offer deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete offer" });
  }
});

module.exports = router;
