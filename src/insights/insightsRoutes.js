// Customer insights: what visitors look at and like.
//   POST /api/insights/track            (public; the site sends events only after analytics consent)
//   GET  /api/insights/summary?days=30  (admin)
//   GET  /api/insights/customer/:userId (admin)
//   DELETE /api/insights/customer/:userId  (admin) delete a customer's tracked activity
//   DELETE /api/insights/visitor/:visitorId (admin) delete an anonymous visitor's activity
const router = require("express").Router();
const ActivityEvent = require("./ActivityEvent");
const User = require("../users/Usermodel");
const Products = require("../products/productsmodel");
const { verifyToken, verifyAdmin, optionalAuth } = require("../middlewere/authMiddleware");

const TYPES = ["page_view", "product_view", "product_like", "product_unlike", "add_to_cart", "product_share"];

// Simple per-IP limit so the endpoint can't be flooded
const hits = new Map();
const rateLimited = (ip) => {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > 60_000) { entry.count = 0; entry.start = now; }
  entry.count += 1;
  hits.set(ip, entry);
  if (hits.size > 10_000) hits.clear();
  return entry.count > 120;
};

const deviceFrom = (ua = "") =>
  /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop";

router.post("/track", optionalAuth, async (req, res) => {
  try {
    if (rateLimited(req.ip)) return res.status(429).end();
    const { visitorId, type, path, productId, productName, referrer } = req.body || {};
    if (!/^[a-zA-Z0-9-]{8,64}$/.test(String(visitorId || "")) || !TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid event" });
    }
    if (type !== "page_view" && !productId) {
      return res.status(400).json({ message: "productId is required" });
    }

    await ActivityEvent.create({
      visitorId,
      userId: req.userId ? String(req.userId) : null, // from the login token, never from the body
      type,
      path: String(path || "").slice(0, 300),
      productId: productId ? String(productId).slice(0, 64) : null,
      productName: String(productName || "").slice(0, 200),
      referrer: String(referrer || "").slice(0, 300),
      device: deviceFrom(req.get("User-Agent")),
    });
    res.status(204).end();
  } catch (error) {
    console.error("Track error:", error.message);
    res.status(204).end(); // tracking must never break the site
  }
});

const sinceDays = (days) => {
  const d = Math.min(Math.max(Number(days) || 30, 1), 180);
  return { days: d, since: new Date(Date.now() - d * 864e5) };
};

// Current like state per (person, product): the latest like/unlike wins
const currentLikesPipeline = (match) => [
  { $match: { ...match, type: { $in: ["product_like", "product_unlike"] } } },
  { $sort: { createdAt: 1 } },
  {
    $group: {
      _id: { actor: { $ifNull: ["$userId", "$visitorId"] }, productId: "$productId" },
      last: { $last: "$type" },
      productName: { $last: "$productName" },
      at: { $last: "$createdAt" },
    },
  },
  { $match: { last: "product_like" } },
];

const productNames = async (ids) => {
  const valid = ids.filter((id) => /^[a-f0-9]{24}$/i.test(String(id)));
  const docs = await Products.find({ _id: { $in: valid } }).select("name image price").lean().catch(() => []);
  return Object.fromEntries(docs.map((p) => [String(p._id), p]));
};

router.get("/summary", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { days, since } = sinceDays(req.query.days);
    const match = { createdAt: { $gte: since } };

    const [counts, visitors, customers, productStats, likes, recent, devices] = await Promise.all([
      ActivityEvent.aggregate([{ $match: match }, { $group: { _id: "$type", n: { $sum: 1 } } }]),
      ActivityEvent.distinct("visitorId", match),
      ActivityEvent.aggregate([
        { $match: { ...match, userId: { $ne: null } } },
        {
          $group: {
            _id: "$userId",
            lastSeen: { $max: "$createdAt" },
            firstSeen: { $min: "$createdAt" },
            events: { $sum: 1 },
            pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
            productViews: { $sum: { $cond: [{ $eq: ["$type", "product_view"] }, 1, 0] } },
            cartAdds: { $sum: { $cond: [{ $eq: ["$type", "add_to_cart"] }, 1, 0] } },
            products: { $addToSet: "$productId" },
          },
        },
        { $sort: { lastSeen: -1 } },
        { $limit: 100 },
      ]),
      ActivityEvent.aggregate([
        { $match: { ...match, productId: { $ne: null }, type: { $in: ["product_view", "add_to_cart"] } } },
        {
          $group: {
            _id: "$productId",
            views: { $sum: { $cond: [{ $eq: ["$type", "product_view"] }, 1, 0] } },
            cartAdds: { $sum: { $cond: [{ $eq: ["$type", "add_to_cart"] }, 1, 0] } },
            viewers: { $addToSet: { $ifNull: ["$userId", "$visitorId"] } },
            productName: { $last: "$productName" },
          },
        },
        { $project: { views: 1, cartAdds: 1, productName: 1, uniqueViewers: { $size: "$viewers" } } },
        { $sort: { views: -1 } },
        { $limit: 30 },
      ]),
      ActivityEvent.aggregate([
        ...currentLikesPipeline(match),
        { $group: { _id: "$_id.productId", likes: { $sum: 1 }, productName: { $last: "$productName" } } },
      ]),
      ActivityEvent.find(match).sort({ createdAt: -1 }).limit(40).lean(),
      ActivityEvent.aggregate([{ $match: match }, { $group: { _id: "$device", visitors: { $addToSet: "$visitorId" } } }, { $project: { n: { $size: "$visitors" } } }]),
    ]);

    // Join customer names / emails
    const users = await User.find({ _id: { $in: customers.map((c) => c._id).filter((id) => /^[a-f0-9]{24}$/i.test(id)) } })
      .select("name email").lean();
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    // Merge likes into product stats
    const likeMap = Object.fromEntries(likes.map((l) => [l._id, l]));
    const productIds = [...new Set([...productStats.map((p) => p._id), ...likes.map((l) => l._id)])];
    const pmap = await productNames(productIds);
    const topProducts = productIds
      .map((id) => {
        const s = productStats.find((p) => p._id === id) || {};
        return {
          productId: id,
          name: pmap[id]?.name || s.productName || likeMap[id]?.productName || "Unknown product",
          image: pmap[id]?.image || "",
          views: s.views || 0,
          uniqueViewers: s.uniqueViewers || 0,
          likes: likeMap[id]?.likes || 0,
          cartAdds: s.cartAdds || 0,
        };
      })
      .sort((a, b) => b.views + b.likes * 3 + b.cartAdds * 5 - (a.views + a.likes * 3 + a.cartAdds * 5))
      .slice(0, 20);

    const c = Object.fromEntries(counts.map((x) => [x._id, x.n]));
    res.json({
      days,
      totals: {
        visitors: visitors.length,
        customers: customers.length,
        pageViews: c.page_view || 0,
        productViews: c.product_view || 0,
        likes: likes.reduce((n, l) => n + l.likes, 0),
        cartAdds: c.add_to_cart || 0,
      },
      devices: Object.fromEntries(devices.map((d) => [d._id || "unknown", d.n])),
      topProducts,
      customers: customers.map((cu) => ({
        userId: cu._id,
        name: userMap[cu._id]?.name || "Customer",
        email: userMap[cu._id]?.email || "",
        lastSeen: cu.lastSeen,
        firstSeen: cu.firstSeen,
        pageViews: cu.pageViews,
        productViews: cu.productViews,
        cartAdds: cu.cartAdds,
        productsViewed: cu.products.filter(Boolean).length,
      })),
      recent: recent.map((e) => ({
        type: e.type,
        at: e.createdAt,
        who: e.userId ? userMap[e.userId]?.name || userMap[e.userId]?.email || "Customer" : `Visitor ${e.visitorId.slice(0, 6)}`,
        userId: e.userId,
        visitorId: e.visitorId, // lets the admin delete an anonymous visitor's activity
        path: e.path,
        productId: e.productId,
        productName: e.productName,
      })),
    });
  } catch (error) {
    console.error("Insights summary error:", error);
    res.status(500).json({ message: "Failed to load insights" });
  }
});

router.get("/customer/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { since } = sinceDays(req.query.days || 180);
    const user = await User.findById(userId).select("name email createdAt").lean().catch(() => null);
    if (!user) return res.status(404).json({ message: "Customer not found" });

    const match = { userId: String(userId), createdAt: { $gte: since } };
    const [events, viewed, liked] = await Promise.all([
      ActivityEvent.find(match).sort({ createdAt: -1 }).limit(200).lean(),
      ActivityEvent.aggregate([
        { $match: { ...match, type: { $in: ["product_view", "add_to_cart"] } } },
        {
          $group: {
            _id: "$productId",
            views: { $sum: { $cond: [{ $eq: ["$type", "product_view"] }, 1, 0] } },
            cartAdds: { $sum: { $cond: [{ $eq: ["$type", "add_to_cart"] }, 1, 0] } },
            lastViewed: { $max: "$createdAt" },
            productName: { $last: "$productName" },
          },
        },
        { $sort: { views: -1, lastViewed: -1 } },
        { $limit: 50 },
      ]),
      ActivityEvent.aggregate(currentLikesPipeline(match)),
    ]);

    const pmap = await productNames([...viewed.map((v) => v._id), ...liked.map((l) => l._id.productId)]);
    res.json({
      customer: { userId, name: user.name, email: user.email, joined: user.createdAt },
      liked: liked.map((l) => ({
        productId: l._id.productId,
        name: pmap[l._id.productId]?.name || l.productName || "Unknown product",
        image: pmap[l._id.productId]?.image || "",
        likedAt: l.at,
      })),
      viewed: viewed.map((v) => ({
        productId: v._id,
        name: pmap[v._id]?.name || v.productName || "Unknown product",
        image: pmap[v._id]?.image || "",
        views: v.views,
        cartAdds: v.cartAdds,
        lastViewed: v.lastViewed,
      })),
      timeline: events.map((e) => ({ type: e.type, at: e.createdAt, path: e.path, productId: e.productId, productName: e.productName, device: e.device })),
    });
  } catch (error) {
    console.error("Customer insights error:", error);
    res.status(500).json({ message: "Failed to load customer" });
  }
});

// Delete everything tracked about a customer: their activity while logged in, and
// what the same browsers recorded before they logged in. Their account and orders stay.
router.delete("/customer/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const userId = String(req.params.userId);
    if (!/^[a-f0-9]{24}$/i.test(userId)) return res.status(400).json({ message: "Invalid customer ID" });
    const visitorIds = await ActivityEvent.distinct("visitorId", { userId });
    const { deletedCount } = await ActivityEvent.deleteMany({ $or: [{ userId }, { visitorId: { $in: visitorIds } }] });
    console.log(`Insights: admin ${req.userId || ""} deleted ${deletedCount} activity records of customer ${userId}`);
    res.json({ message: "Customer activity deleted", deleted: deletedCount });
  } catch (error) {
    console.error("Delete customer insights error:", error);
    res.status(500).json({ message: "Failed to delete customer activity" });
  }
});

// Delete an anonymous visitor's activity (the random ID their browser was given)
router.delete("/visitor/:visitorId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const visitorId = String(req.params.visitorId);
    if (!/^[\w-]{6,100}$/.test(visitorId)) return res.status(400).json({ message: "Invalid visitor ID" });
    const { deletedCount } = await ActivityEvent.deleteMany({ visitorId });
    console.log(`Insights: admin ${req.userId || ""} deleted ${deletedCount} activity records of visitor ${visitorId.slice(0, 8)}…`);
    res.json({ message: "Visitor activity deleted", deleted: deletedCount });
  } catch (error) {
    console.error("Delete visitor insights error:", error);
    res.status(500).json({ message: "Failed to delete visitor activity" });
  }
});

// Delete ALL tracked activity (admin; the page's "Delete all insights data").
// Body must be { confirm: "DELETE ALL" }. Customer accounts and orders stay.
router.post("/delete-all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (req.body?.confirm !== "DELETE ALL") return res.status(400).json({ message: "Confirmation missing" });
    const { deletedCount } = await ActivityEvent.deleteMany({});
    console.log(`Insights: admin ${req.userId || ""} deleted ALL activity records (${deletedCount})`);
    res.json({ message: "All insights data deleted", deleted: deletedCount });
  } catch (error) {
    console.error("Delete all insights error:", error);
    res.status(500).json({ message: "Failed to delete insights data" });
  }
});

module.exports = router;
