const router = require('express').Router();
const Visit = require('./Visitmodel');
const User = require('../users/Usermodel');
const Products = require('../products/productsmodel');
const ActivityEvent = require('../insights/ActivityEvent');
const { verifyToken, verifyAdmin } = require('../middlewere/authMiddleware');

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const getUniqueVisitorCount = async () => {
  const result = await Visit.aggregate([
    { $group: { _id: '$visitorId' } },
    { $count: 'count' },
  ]).allowDiskUse(true);

  return result[0]?.count || 0;
};

// ?range=7d | 30d | 90d (the dashboard's period buttons); default 7 days
const rangeStart = (range) => {
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range] || 7;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

// Get dashboard stats
router.get('/visitor-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = rangeStart(req.query.range); // start of the chosen period

    const [totalVisits, uniqueCount, todayVisits, dailyStats, topPages] =
      await Promise.all([
        Visit.estimatedDocumentCount(),

        getUniqueVisitorCount(),

        Visit.countDocuments({
          timestamp: { $gte: today },
        }),

        Visit.aggregate([
          { $match: { timestamp: { $gte: sevenDaysAgo } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$timestamp',
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]).allowDiskUse(true),

        Visit.aggregate([
          { $match: { timestamp: { $gte: sevenDaysAgo } } },
          {
            $group: {
              _id: '$page',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]).allowDiskUse(true),
      ]);

    res.json({
      totalVisits,
      uniqueVisitors: uniqueCount,
      todayVisits,
      dailyStats,
      topPages,
    });
  } catch (error) {
    console.error('Error fetching visitor stats:', error);
    res.status(500).json({ message: 'Failed to load visitor stats' });
  }
});

// ── Readable visitor details ────────────────────────────────────────────────
// Device / OS / browser from the user-agent text (good enough for a dashboard)
const describeAgent = (ua = '') => ({
  device: /ipad|tablet/i.test(ua) ? 'Tablet' : /mobi|android|iphone/i.test(ua) ? 'Mobile' : /bot|crawl|spider|curl|python|node-fetch|axios/i.test(ua) ? 'Bot' : 'Desktop',
  os: /windows/i.test(ua) ? 'Windows' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ios/i.test(ua) ? 'iOS' : /mac os/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Other',
  browser: /edg\//i.test(ua) ? 'Edge' : /opr\/|opera/i.test(ua) ? 'Opera' : /chrome\//i.test(ua) ? 'Chrome' : /firefox\//i.test(ua) ? 'Firefox' : /safari\//i.test(ua) ? 'Safari' : 'Other',
});

// The visitor log records API calls; turn them into the page the visitor was on
const PRODUCT_ID = /^\/api\/products\/([a-f0-9]{24})/i;
const pageLabel = (path = '', productNames = {}) => {
  const p = path.split('?')[0];
  const product = p.match(PRODUCT_ID);
  if (product) return `Product: ${productNames[product[1]] || 'product page'}`;
  if (/^\/api\/products\/related\//.test(p)) return null; // part of a product page
  if (/^\/api\/products\/?$/.test(p)) return 'Shop';
  if (/^\/api\/hero-slides/.test(p)) return 'Home page';
  if (/^\/api\/reviews\/product\//.test(p)) return null; // part of a product page
  if (/^\/api\/orders\/track\//.test(p)) return 'Track order';
  if (/^\/api\/orders\/my-orders|^\/api\/orders\/order\//.test(p)) return 'My orders';
  if (/^\/api\/orders|^\/api\/payment/.test(p)) return 'Checkout';
  if (/^\/api\/bulk-quotes/.test(p)) return 'Bulk quote';
  if (/^\/api\/press/.test(p)) return 'Press & news';
  if (/^\/api\/jobs/.test(p)) return 'Careers';
  if (/^\/api\/offers/.test(p)) return 'Offers';
  if (/^\/api\/newsletter/.test(p)) return 'Newsletter sign-up';
  if (/^\/api\/contact|^\/api\/quote/.test(p)) return 'Contact / quote form';
  if (/^\/api\/stats|^\/api\/uploadImages|^\/uploadImages/.test(p)) return 'Dashboard';
  if (/^\/p\//.test(p)) return 'Shared product link';
  if (/^\/sitemap|^\/robots/.test(p)) return null; // search engines
  return p.length > 40 ? `${p.slice(0, 40)}…` : p;
};

// Get detailed visitor list
//   ?range=7d|30d|90d   ?who=users|guests (default: everyone)   ?page= &limit=
router.get('/visitors', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;
    const who = req.query.who === 'users' ? { userId: { $ne: null } } : req.query.who === 'guests' ? { userId: { $in: [null] } } : null;

    const since = req.query.range ? { timestamp: { $gte: rangeStart(req.query.range) } } : {};

    // Step 1: the most recent visits (newest first, via the timestamp index),
    // grouped per visitor. Working on a bounded window keeps every stage under
    // MongoDB's 32 MB sort limit (this database plan can't sort on disk).
    const WINDOW = 20000;
    const [shown, totalRow] = await Promise.all([
      Visit.aggregate([
        ...(req.query.range ? [{ $match: since }] : []),
        { $sort: { timestamp: -1 } },
        { $limit: WINDOW },
        {
          $group: {
            _id: '$visitorId',
            ip: { $first: '$ip' },
            userAgent: { $first: '$userAgent' },
            userId: { $max: '$userId' }, // any visit made while logged in
            firstVisit: { $min: '$timestamp' },
            lastVisit: { $max: '$timestamp' },
            pageCount: { $sum: 1 },
          },
        },
        ...(who ? [{ $match: who }] : []),
        { $sort: { lastVisit: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      // How many visitors in total for this period/filter (counting needs no sort)
      Visit.aggregate([
        ...(req.query.range ? [{ $match: since }] : []),
        ...(req.query.who === 'users' ? [{ $match: { userId: { $ne: null } } }] : []),
        { $group: { _id: '$visitorId', userId: { $max: '$userId' } } },
        ...(req.query.who === 'guests' ? [{ $match: { userId: null } }] : []),
        { $count: 'count' },
      ]),
    ]);
    const total = totalRow?.[0]?.count || 0;

    // Step 2: the latest pages of just the visitors on this page
    const pageRows = shown.length
      ? await Visit.aggregate([
          { $match: { ...since, visitorId: { $in: shown.map((v) => v._id) } } },
          { $sort: { timestamp: -1 } },
          { $group: { _id: '$visitorId', pages: { $push: '$page' } } },
          { $project: { pages: { $slice: ['$pages', 60] } } },
        ]).allowDiskUse(true)
      : [];
    const pagesOf = Object.fromEntries(pageRows.map((r) => [r._id, r.pages]));
    const rows = shown.map((v) => ({ ...v, pages: pagesOf[v._id] || [] }));

    // Names/emails of logged-in visitors, product names for "Product: …" pages,
    // and the website pages logged-in customers opened (from Customer Insights)
    const userIds = [...new Set(rows.map((v) => v.userId).filter((id) => /^[a-f0-9]{24}$/i.test(id || '')))];
    const productIds = [...new Set(rows.flatMap((v) => v.pages.map((p) => (String(p).match(PRODUCT_ID) || [])[1]).filter(Boolean)))];
    const [users, products, sitePages] = await Promise.all([
      userIds.length ? User.find({ _id: { $in: userIds } }).select('name email').lean() : [],
      productIds.length ? Products.find({ _id: { $in: productIds } }).select('name').lean() : [],
      userIds.length
        ? ActivityEvent.aggregate([
            { $match: { userId: { $in: userIds }, type: { $in: ['page_view', 'product_view'] } } },
            { $sort: { createdAt: -1 } },
            { $group: { _id: '$userId', views: { $push: { path: '$path', product: '$productName', at: '$createdAt' } } } },
            { $project: { views: { $slice: ['$views', 30] } } },
          ])
        : [],
    ]);
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));
    const productNames = Object.fromEntries(products.map((p) => [String(p._id), p.name]));
    const siteMap = Object.fromEntries(sitePages.map((s) => [s._id, s.views]));

    const visitors = rows.map((v) => {
      const u = v.userId ? userMap[v.userId] : null;
      const labels = [...new Set(v.pages.map((p) => pageLabel(p, productNames)).filter(Boolean))].slice(0, 12);
      const website = (siteMap[v.userId] || []).map((e) => (e.product ? `Product: ${e.product}` : e.path));
      return {
        _id: v._id,
        ip: v.ip,
        ...describeAgent(v.userAgent),
        user: u ? { id: String(u._id), name: u.name || '', email: u.email || '' } : null,
        firstVisit: v.firstVisit,
        lastVisit: v.lastVisit,
        pageCount: v.pageCount,
        pages: labels,
        websitePages: [...new Set(website)].slice(0, 12),
      };
    });

    res.json({ visitors, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching visitor list:', error);
    res.status(500).json({ message: 'Failed to load visitors' });
  }
});

module.exports = router;