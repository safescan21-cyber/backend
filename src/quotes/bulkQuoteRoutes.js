// Bulk order / quote requests
//   POST  /api/bulk-quotes        anyone (logged in or not) — spam-protected
//   GET   /api/bulk-quotes/mine   logged-in customer's own requests
//   GET   /api/bulk-quotes        admin: list, filter by status, search
//   PATCH /api/bulk-quotes/:id    admin: change status / notes
const router = require("express").Router();
const BulkQuote = require("./BulkQuote");
const User = require("../users/Usermodel");
const { verifyToken, verifyAdmin, optionalAuth } = require("../middlewere/authMiddleware");
const { sendBulkQuoteEmails } = require("../users/email");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STATUSES = ["new", "contacted", "quoted", "won", "lost"];
const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// 5 requests per 10 minutes per IP
const hits = new Map();
const limited = (ip) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) return true;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10000) hits.clear();
  return false;
};

// BQ-20261016-0042
const newQuoteNumber = async () => {
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  for (let i = 0; i < 5; i++) {
    const n = `BQ-${day}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    if (!(await BulkQuote.exists({ quoteNumber: n }))) return n;
  }
  return `BQ-${day}-${Date.now().toString().slice(-6)}`;
};

// Business email first; the customer confirmation only after it succeeds.
// Delivery times / errors are saved on the quote for the admin page.
const sendQuoteEmails = (quote) => {
  const id = quote._id;
  const record = (fields) => BulkQuote.updateOne({ _id: id }, { $set: fields }).catch(() => {});
  try {
    sendBulkQuoteEmails(quote, {
      onAdminSent: () => record({ "emails.adminSentAt": new Date(), "emails.error": "" }),
      onCustomerSent: () => record({ "emails.customerSentAt": new Date() }),
      onError: (msg) => {
        console.error(`Bulk quote ${quote.quoteNumber}: ${msg}`);
        record({ "emails.error": msg.slice(0, 300) });
      },
    });
  } catch (mailError) {
    console.error("Bulk quote email failed:", mailError.message);
  }
};

router.post("/", optionalAuth, async (req, res) => {
  try {
    const b = req.body || {};
    if (b.website) return res.status(201).json({ success: true, quoteNumber: "BQ-RECEIVED" }); // honeypot: bots fill this

    if (limited(req.ip)) {
      return res.status(429).json({ message: "Too many requests. Please try again in a few minutes." });
    }

    const contact = {
      name: clean(b.name, 100),
      company: clean(b.company, 150),
      email: clean(b.email, 150).toLowerCase(),
      phone: clean(b.phone, 30),
      gstin: clean(b.gstin, 20).toUpperCase(),
    };
    if (!contact.name || !contact.email || !contact.phone) {
      return res.status(400).json({ message: "Please enter your name, email and phone number." });
    }
    if (!EMAIL_RE.test(contact.email)) return res.status(400).json({ message: "Please enter a valid email address." });
    if (!/^[+\d][\d\s-]{6,}$/.test(contact.phone)) return res.status(400).json({ message: "Please enter a valid phone number." });

    const items = (Array.isArray(b.items) ? b.items : [])
      .map((i) => ({
        productId: clean(i?.productId, 64),
        name: clean(i?.name, 200),
        quantity: Math.floor(Number(i?.quantity)),
        notes: clean(i?.notes, 500),
      }))
      .filter((i) => i.name);
    if (!items.length) return res.status(400).json({ message: "Add at least one product with a quantity." });
    if (items.length > 50) return res.status(400).json({ message: "Please send up to 50 items per request." });
    if (items.some((i) => !(i.quantity >= 1 && i.quantity <= 1000000))) {
      return res.status(400).json({ message: "Each item needs a quantity of at least 1." });
    }

    let requiredBy;
    if (b.requiredBy) {
      requiredBy = new Date(b.requiredBy);
      if (Number.isNaN(requiredBy.getTime())) requiredBy = undefined;
    }

    const quote = await BulkQuote.create({
      quoteNumber: await newQuoteNumber(),
      userId: req.userId ? String(req.userId) : null,
      contact,
      items,
      deliveryCity: clean(b.deliveryCity, 100),
      deliveryState: clean(b.deliveryState, 100),
      country: clean(b.country, 60) || "India",
      requiredBy,
      message: String(b.message ?? "").trim().slice(0, 3000),
      source: ["navbar", "cart", "product"].includes(b.source) ? b.source : "other",
    });

    sendQuoteEmails(quote);

    res.status(201).json({ success: true, quoteNumber: quote.quoteNumber });
  } catch (error) {
    console.error("Bulk quote error:", error);
    res.status(500).json({ message: "Could not send your request right now. Please try again or contact us on WhatsApp." });
  }
});

router.get("/mine", verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.userId).select("email").lean().catch(() => null);
    const or = [{ userId: String(req.userId) }];
    if (me?.email) or.push({ "contact.email": me.email.toLowerCase() });
    const quotes = await BulkQuote.find({ $or: or }).select("-adminNotes -emails.error").sort({ createdAt: -1 }).limit(100).lean();
    res.json({ quotes });
  } catch (error) {
    res.status(500).json({ message: "Could not load your quote requests" });
  }
});

router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    const q = clean(req.query.q, 100);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ quoteNumber: rx }, { "contact.name": rx }, { "contact.company": rx }, { "contact.email": rx }, { "items.name": rx }];
    }
    const [quotes, counts] = await Promise.all([
      BulkQuote.find(filter).sort({ createdAt: -1 }).limit(200).lean(),
      BulkQuote.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);
    res.json({ quotes, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
  } catch (error) {
    res.status(500).json({ message: "Could not load quote requests" });
  }
});

router.patch("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const update = {};
    if (req.body.status !== undefined) {
      if (!STATUSES.includes(req.body.status)) return res.status(400).json({ message: "Unknown status" });
      update.status = req.body.status;
    }
    if (req.body.adminNotes !== undefined) update.adminNotes = String(req.body.adminNotes).slice(0, 3000);
    const quote = await BulkQuote.findByIdAndUpdate(req.params.id, update, { new: true }).catch(() => null);
    if (!quote) return res.status(404).json({ message: "Quote request not found" });
    res.json({ quote });
  } catch (error) {
    res.status(500).json({ message: "Could not update the quote request" });
  }
});

// Admin: try the emails again (e.g. after fixing the Gmail password)
router.post("/:id/resend-emails", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const quote = await BulkQuote.findById(req.params.id).catch(() => null);
    if (!quote) return res.status(404).json({ message: "Quote request not found" });
    await BulkQuote.updateOne({ _id: quote._id }, { $set: { "emails.error": "", "emails.adminSentAt": null, "emails.customerSentAt": null } });
    sendQuoteEmails(quote);
    res.json({ message: "Emails queued. The customer is emailed once your copy has been sent." });
  } catch (error) {
    res.status(500).json({ message: "Could not resend the emails" });
  }
});

module.exports = router;
