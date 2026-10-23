// Service requests and AMC (annual maintenance contract) bookings, plus AMC plans
//   POST   /api/service/requests            anyone (logged in or not) — spam-protected
//   GET    /api/service/requests/mine       logged-in customer's own requests (with timeline)
//   GET    /api/service/requests            admin: list, filter by status / type, search
//   PATCH  /api/service/requests/:id        admin: status, visit date, note to customer, private notes
//   GET    /api/service/amc-plans           anyone: active plans for /amc
//   GET    /api/service/amc-plans/all       admin: every plan
//   POST   /api/service/amc-plans           admin: add a plan
//   PATCH  /api/service/amc-plans/:id       admin: change a plan
//   DELETE /api/service/amc-plans/:id       admin: delete a plan
const router = require("express").Router();
const ServiceRequest = require("./ServiceRequest");
const { STATUSES } = require("./ServiceRequest");
const AmcPlan = require("./AmcPlan");
const User = require("../users/Usermodel");
const { verifyToken, verifyAdmin, optionalAuth } = require("../middlewere/authMiddleware");
const { sendServiceRequestEmails, sendServiceUpdateEmail } = require("../users/email");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s-]{6,}$/;
const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const text = (v, max) => String(v ?? "").trim().slice(0, max);

// 5 requests per 10 minutes per visitor
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

const newNumber = async () => {
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  for (let i = 0; i < 5; i++) {
    const n = `SR-${day}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    if (!(await ServiceRequest.exists({ number: n }))) return n;
  }
  return `SR-${day}-${Date.now().toString().slice(-6)}`;
};

// Emails go out in the background; delivery is recorded on the request
const notify = (request) => {
  const record = (fields) => ServiceRequest.updateOne({ _id: request._id }, { $set: fields }).catch(() => {});
  try {
    sendServiceRequestEmails(request, {
      onAdminSent: () => record({ "emails.adminSentAt": new Date() }),
      onCustomerSent: () => record({ "emails.customerSentAt": new Date() }),
      onError: (msg) => { console.error(`Service request ${request.number}: ${msg}`); record({ "emails.error": msg.slice(0, 300) }); },
    });
  } catch (err) {
    console.error("Service request email failed:", err.message);
  }
};

router.post("/requests", optionalAuth, async (req, res) => {
  try {
    const b = req.body || {};
    if (b.website) return res.status(201).json({ success: true, number: "SR-RECEIVED" }); // honeypot: bots fill this
    if (limited(req.ip)) return res.status(429).json({ message: "Too many requests. Please try again in a few minutes or call us." });

    const type = b.type === "amc" ? "amc" : "service";
    const contact = { name: clean(b.name, 100), company: clean(b.company, 150), phone: clean(b.phone, 30), email: clean(b.email, 150).toLowerCase() };
    if (!contact.name || !PHONE_RE.test(contact.phone)) return res.status(400).json({ message: "Please enter your name and a valid phone number." });
    if (contact.email && !EMAIL_RE.test(contact.email)) return res.status(400).json({ message: "Please enter a valid email address, or leave it empty." });

    const machine = { name: clean(b.machineName, 200), model: clean(b.machineModel, 100), serialNumber: clean(b.serialNumber, 100) };
    const year = parseInt(b.installedYear, 10);
    if (year >= 1950 && year <= 2100) machine.installedYear = year;
    const issue = text(b.issue, 3000);
    if (type === "service" && (!machine.name || issue.length < 10)) {
      return res.status(400).json({ message: "Tell us which machine it is and what the problem is (at least a sentence)." });
    }

    let amc;
    if (type === "amc") {
      const plan = b.planId && /^[a-f0-9]{24}$/i.test(b.planId) ? await AmcPlan.findOne({ _id: b.planId, active: true }).lean() : null;
      const machines = Math.floor(Number(b.machines));
      amc = { planId: plan ? String(plan._id) : "", planName: plan ? plan.name : clean(b.planName, 120) || "Not sure yet", machines: machines >= 1 && machines <= 500 ? machines : 1 };
    }

    // Photos only from logged-in customers, and only our own Cloudinary uploads
    const photos = req.userId && Array.isArray(b.photos)
      ? b.photos.filter((u) => typeof u === "string" && /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//.test(u)).slice(0, 5)
      : [];

    const request = await ServiceRequest.create({
      number: await newNumber(),
      type,
      userId: req.userId ? String(req.userId) : null,
      contact,
      machine,
      issue,
      urgency: ["normal", "urgent", "machine_down"].includes(b.urgency) ? b.urgency : "normal",
      photos,
      ...(amc && { amc }),
      city: clean(b.city, 100),
      state: clean(b.state, 100),
      updates: [{ status: "open", note: type === "amc" ? "AMC request received" : "Service request received" }],
    });
    notify(request);
    res.status(201).json({ success: true, number: request.number });
  } catch (error) {
    console.error("Service request error:", error);
    res.status(500).json({ message: "Could not send your request right now. Please call or WhatsApp us." });
  }
});

router.get("/requests/mine", verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.userId).select("email").lean().catch(() => null);
    const or = [{ userId: String(req.userId) }];
    if (me?.email) or.push({ "contact.email": me.email.toLowerCase() });
    const requests = await ServiceRequest.find({ $or: or }).select("-adminNotes -emails").sort({ createdAt: -1 }).limit(100).lean();
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Could not load your requests" });
  }
});

router.get("/requests", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (["service", "amc"].includes(req.query.type)) filter.type = req.query.type;
    const q = clean(req.query.q, 100);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ number: rx }, { "contact.name": rx }, { "contact.company": rx }, { "contact.phone": rx }, { "machine.name": rx }, { "machine.model": rx }, { "machine.serialNumber": rx }];
    }
    const [requests, counts] = await Promise.all([
      ServiceRequest.find(filter).sort({ createdAt: -1 }).limit(300).lean(),
      ServiceRequest.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);
    res.json({ requests, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
  } catch (error) {
    res.status(500).json({ message: "Could not load service requests" });
  }
});

router.patch("/requests/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id).catch(() => null);
    if (!request) return res.status(404).json({ message: "Request not found" });
    const b = req.body || {};
    const before = request.status;
    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) return res.status(400).json({ message: "Unknown status" });
      request.status = b.status;
    }
    if (b.scheduledFor !== undefined) {
      const d = b.scheduledFor ? new Date(b.scheduledFor) : null;
      request.scheduledFor = d && !Number.isNaN(d.getTime()) ? d : undefined;
    }
    if (b.adminNotes !== undefined) request.adminNotes = text(b.adminNotes, 3000);
    const note = text(b.note, 1000);
    const changed = request.status !== before || note;
    if (changed) request.updates.push({ status: request.status, note });
    await request.save();

    // Tell the customer about a new status or a note (not about private notes)
    let emailed = false;
    if (changed && request.contact.email) {
      try { await sendServiceUpdateEmail(request.toObject(), note); emailed = true; } catch (err) { console.error(`Service update email ${request.number}:`, err.message); }
    }
    res.json({ request: request.toObject(), emailed });
  } catch (error) {
    res.status(500).json({ message: "Could not update the request" });
  }
});

// ── AMC plans ──
const cleanPlan = (b) => ({
  name: clean(b.name, 80),
  summary: clean(b.summary, 300),
  visitsPerYear: Math.max(0, Math.min(52, Math.floor(Number(b.visitsPerYear) || 0))),
  priceText: clean(b.priceText, 120) || "Price on request",
  features: (Array.isArray(b.features) ? b.features : String(b.features || "").split("\n")).map((f) => clean(f, 200)).filter(Boolean).slice(0, 20),
  highlight: Boolean(b.highlight),
  active: b.active !== false,
  order: Math.floor(Number(b.order) || 0),
});

router.get("/amc-plans", async (req, res) => {
  try {
    res.json({ plans: await AmcPlan.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean() });
  } catch (error) {
    res.status(500).json({ message: "Could not load the plans" });
  }
});
router.get("/amc-plans/all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    res.json({ plans: await AmcPlan.find().sort({ order: 1, createdAt: 1 }).lean() });
  } catch (error) {
    res.status(500).json({ message: "Could not load the plans" });
  }
});
router.post("/amc-plans", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const plan = cleanPlan(req.body || {});
    if (!plan.name) return res.status(400).json({ message: "Give the plan a name." });
    res.status(201).json({ plan: await AmcPlan.create(plan) });
  } catch (error) {
    res.status(500).json({ message: "Could not save the plan" });
  }
});
router.patch("/amc-plans/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const plan = cleanPlan(req.body || {});
    if (!plan.name) return res.status(400).json({ message: "Give the plan a name." });
    const saved = await AmcPlan.findByIdAndUpdate(req.params.id, plan, { returnDocument: "after" }).catch(() => null);
    if (!saved) return res.status(404).json({ message: "Plan not found" });
    res.json({ plan: saved });
  } catch (error) {
    res.status(500).json({ message: "Could not save the plan" });
  }
});
router.delete("/amc-plans/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const gone = await AmcPlan.findByIdAndDelete(req.params.id).catch(() => null);
    if (!gone) return res.status(404).json({ message: "Plan not found" });
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: "Could not delete the plan" });
  }
});

module.exports = router;
