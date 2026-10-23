// Bulk order / quote requests
//   POST  /api/bulk-quotes        anyone (logged in or not) — spam-protected
//   POST  /api/bulk-quotes/quick  short form on machine pages (see below)
//   GET   /api/bulk-quotes/mine   logged-in customer's own requests
//   GET   /api/bulk-quotes        admin: list, filter by status, search
//   PATCH /api/bulk-quotes/:id    admin: change status / notes
//   GET   /api/bulk-quotes/export.csv              admin: all requests as a spreadsheet
//   PUT   /api/bulk-quotes/:id/quotation           admin: save the quotation (builder)
//   GET   /api/bulk-quotes/:id/quotation.pdf       admin: the quotation PDF
//   POST  /api/bulk-quotes/:id/quotation/send      admin: email it (PDF attached) and mark "quoted"
//   GET   /api/bulk-quotes/q/:token.pdf            anyone with the link (sent on WhatsApp/email)
const router = require("express").Router();
const BulkQuote = require("./BulkQuote");
const User = require("../users/Usermodel");
const { verifyToken, verifyAdmin, optionalAuth } = require("../middlewere/authMiddleware");
const crypto = require("crypto");
const { sendBulkQuoteEmails, sendQuotationEmail } = require("../users/email");
const { generateQuotationPdf, quotationTotals } = require("./quotationPdf");
const { toWhatsAppNumber } = require("../utils/whatsapp");

// Public address of this API, for the quotation link in emails and WhatsApp messages
const PUBLIC_API = (process.env.PUBLIC_API_URL || "https://api.foodpharmamachinery.com").replace(/\/$/, "");
const pdfLink = (quote) => (quote.quotation?.publicToken ? `${PUBLIC_API}/api/bulk-quotes/q/${quote.quotation.publicToken}.pdf` : "");

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

// Where the lead came from, as the website recorded it on the visitor's first page
const CHANNELS = ["google", "bing", "yahoo", "whatsapp", "facebook", "instagram", "linkedin", "youtube", "indiamart", "tradeindia", "email", "ads", "referral", "direct", "other"];
const cleanOrigin = (o) => {
  if (!o || typeof o !== "object") return undefined;
  const channel = clean(o.channel, 40).toLowerCase();
  return {
    channel: CHANNELS.includes(channel) ? channel : channel ? "other" : "",
    source: clean(o.source, 100),
    medium: clean(o.medium, 100),
    campaign: clean(o.campaign, 150),
    landing: clean(o.landing, 300),
  };
};

// QT-20261023-0042 (quotation) / BQ-20261016-0042 (request)
const newNumber = async (prefix, field) => {
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  for (let i = 0; i < 5; i++) {
    const n = `${prefix}-${day}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    if (!(await BulkQuote.exists({ [field]: n }))) return n;
  }
  return `${prefix}-${day}-${Date.now().toString().slice(-6)}`;
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
      onCustomerSent: (messageId) => record({ "emails.customerSentAt": new Date(), "emails.customerMessageId": String(messageId || "") }),
      onError: (msg) => {
        console.error(`Bulk quote ${quote.quoteNumber}: ${msg}`);
        record({ "emails.error": msg.slice(0, 300) });
      },
    });
  } catch (mailError) {
    console.error("Bulk quote email failed:", mailError.message);
  }
};

// "Get a quote in 2 minutes" form on machine pages: machine, capacity, city, name and
// phone (email optional). Saved as a bulk quote (source "quick"), so it reaches the
// same business email and admin page.
router.post("/quick", optionalAuth, async (req, res) => {
  try {
    const b = req.body || {};
    if (b.website) return res.status(201).json({ success: true, quoteNumber: "BQ-RECEIVED" }); // honeypot
    if (limited(req.ip)) {
      return res.status(429).json({ message: "Too many requests. Please try again in a few minutes." });
    }
    const contact = { name: clean(b.name, 100), company: clean(b.company, 150), email: clean(b.email, 150).toLowerCase(), phone: clean(b.phone, 30), gstin: "" };
    const machine = clean(b.machine, 200);
    const capacity = clean(b.capacity, 200);
    const city = clean(b.city, 100);
    if (!machine) return res.status(400).json({ message: "Please tell us which machine you need." });
    if (!contact.name || !contact.phone) return res.status(400).json({ message: "Please enter your name and phone number." });
    if (!/^[+\d][\d\s-]{6,}$/.test(contact.phone)) return res.status(400).json({ message: "Please enter a valid phone number." });
    if (contact.email && !EMAIL_RE.test(contact.email)) return res.status(400).json({ message: "Please enter a valid email address, or leave it empty." });

    const quote = await BulkQuote.create({
      quoteNumber: await newQuoteNumber(),
      userId: req.userId ? String(req.userId) : null,
      contact,
      items: [{ productId: clean(b.productId, 64), name: machine, quantity: 1, notes: capacity ? `Capacity: ${capacity}` : "" }],
      deliveryCity: city,
      country: "India",
      message: [capacity && `Required capacity: ${capacity}`, city && `City: ${city}`].filter(Boolean).join("\n"),
      source: "quick",
      origin: cleanOrigin(b.origin),
    });
    sendQuoteEmails(quote);
    res.status(201).json({ success: true, quoteNumber: quote.quoteNumber });
  } catch (error) {
    console.error("Quick quote error:", error);
    res.status(500).json({ message: "Could not send your request right now. Please try again or contact us on WhatsApp." });
  }
});

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
      origin: cleanOrigin(b.origin),
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

// Spreadsheet of every request (opens in Excel / Google Sheets)
router.get("/export.csv", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const quotes = await BulkQuote.find().sort({ createdAt: -1 }).limit(10000).lean();
    const cell = (v) => {
      const s = String(v ?? "").replace(/\r?\n/g, " ");
      // Quote every cell; a leading = + - @ would run as a formula in Excel
      return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
    };
    const head = ["Date", "Request no", "Status", "Form", "Name", "Company", "Phone", "Email", "GSTIN", "Items", "City", "State", "Country",
      "Lead channel", "Lead source", "Medium", "Campaign", "Landing page", "Quotation no", "Quotation total (INR)", "Quotation sent", "Admin notes"];
    const rows = quotes.map((q) => [
      new Date(q.createdAt).toISOString().slice(0, 16).replace("T", " "),
      q.quoteNumber, q.status, q.source,
      q.contact?.name, q.contact?.company, q.contact?.phone, q.contact?.email, q.contact?.gstin,
      (q.items || []).map((i) => `${i.name} x${i.quantity}${i.notes ? ` (${i.notes})` : ""}`).join("; "),
      q.deliveryCity, q.deliveryState, q.country,
      q.origin?.channel, q.origin?.source, q.origin?.medium, q.origin?.campaign, q.origin?.landing,
      q.quotation?.number, q.quotation?.total || "", q.quotation?.sentAt ? new Date(q.quotation.sentAt).toISOString().slice(0, 10) : "",
      q.adminNotes,
    ]);
    const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n"); // BOM: Excel reads ₹ and Hindi names correctly
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Could not export the requests" });
  }
});

// Quotation builder: save lines, GST, freight and terms (totals are worked out here)
router.put("/:id/quotation", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const quote = await BulkQuote.findById(req.params.id).catch(() => null);
    if (!quote) return res.status(404).json({ message: "Quote request not found" });
    const b = req.body || {};
    const num = (v, min, max, dflt) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
    };
    const items = (Array.isArray(b.items) ? b.items : [])
      .map((i) => ({ name: clean(i?.name, 200), quantity: Math.floor(num(i?.quantity, 1, 1000000, 1)), unitPrice: num(i?.unitPrice, 0, 1e10, 0), notes: clean(i?.notes, 500) }))
      .filter((i) => i.name)
      .slice(0, 50);
    if (!items.length) return res.status(400).json({ message: "Add at least one line with a machine or item." });
    const q = {
      ...((quote.quotation && quote.quotation.toObject?.()) || {}),
      items,
      gstPercent: num(b.gstPercent, 0, 28, 18),
      freight: num(b.freight, 0, 1e9, 0),
      deliveryTime: clean(b.deliveryTime, 200),
      paymentTerms: clean(b.paymentTerms, 500),
      warranty: clean(b.warranty, 300),
      validityDays: Math.floor(num(b.validityDays, 1, 365, 15)),
      notes: String(b.notes ?? "").trim().slice(0, 2000),
      updatedAt: new Date(),
    };
    Object.assign(q, quotationTotals(q));
    if (!q.number) q.number = await newNumber("QT", "quotation.number");
    if (!q.publicToken) q.publicToken = crypto.randomBytes(16).toString("hex");
    quote.quotation = q;
    await quote.save();
    res.json({ quote: quote.toObject(), pdfUrl: pdfLink(quote) });
  } catch (error) {
    console.error("Quotation save error:", error);
    res.status(500).json({ message: "Could not save the quotation" });
  }
});

router.get("/:id/quotation.pdf", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const quote = await BulkQuote.findById(req.params.id).lean().catch(() => null);
    if (!quote?.quotation?.number) return res.status(404).json({ message: "No quotation saved yet" });
    const pdf = await generateQuotationPdf(quote);
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `inline; filename="Quotation-${quote.quotation.number}.pdf"`);
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ message: "Could not create the PDF" });
  }
});

// Email the quotation (PDF attached, a copy to the business) and mark the request "quoted".
// Also returns a WhatsApp message with the PDF link for the admin to send.
router.post("/:id/quotation/send", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const quote = await BulkQuote.findById(req.params.id).catch(() => null);
    if (!quote?.quotation?.number) return res.status(400).json({ message: "Save the quotation first" });
    const link = pdfLink(quote);
    let emailed = false;
    let emailError = "";
    if (quote.contact?.email) {
      try {
        const pdf = await generateQuotationPdf(quote.toObject());
        await sendQuotationEmail(quote.toObject(), pdf, link);
        emailed = true;
      } catch (err) {
        emailError = err.message;
        console.error(`Quotation ${quote.quotation.number}: email failed:`, err.message);
      }
    }
    quote.quotation.sentAt = new Date();
    quote.quotation.sentTo = emailed ? quote.contact.email : "";
    quote.quotation.followUpSentAt = undefined;
    if (["new", "contacted"].includes(quote.status)) quote.status = "quoted";
    await quote.save();

    const phone = toWhatsAppNumber(quote.contact?.phone);
    const text = `Dear ${quote.contact?.name}, thank you for your enquiry ${quote.quoteNumber}. Our quotation ${quote.quotation.number} (total ${`Rs. ${Number(quote.quotation.total).toLocaleString("en-IN")}`} incl. GST) is here: ${link}`;
    res.json({
      quote: quote.toObject(),
      emailed,
      emailError,
      pdfUrl: link,
      whatsappUrl: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : "",
    });
  } catch (error) {
    console.error("Quotation send error:", error);
    res.status(500).json({ message: "Could not send the quotation" });
  }
});

// The quotation PDF for whoever has the link (random 32-character token)
router.get("/q/:token.pdf", async (req, res) => {
  try {
    if (!/^[a-f0-9]{32}$/.test(req.params.token)) return res.status(404).send("Not found");
    const quote = await BulkQuote.findOne({ "quotation.publicToken": req.params.token }).lean();
    if (!quote?.quotation?.number) return res.status(404).send("Not found");
    const pdf = await generateQuotationPdf(quote);
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `inline; filename="Quotation-${quote.quotation.number}.pdf"`);
    res.set("X-Robots-Tag", "noindex");
    res.set("Cache-Control", "private, no-store");
    res.send(pdf);
  } catch (error) {
    res.status(500).send("Could not create the PDF");
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
