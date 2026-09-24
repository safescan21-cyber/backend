const router = require('express').Router();
const Visit = require('./Visitmodel');
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

// Get dashboard stats
router.get('/visitor-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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
    res.status(500).json({ message: error.message });
  }
});

// Get detailed visitor list
router.get('/visitors', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;

    const [result] = await Visit.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$visitorId',
          ip: { $first: '$ip' },
          userAgent: { $first: '$userAgent' },
          firstVisit: { $last: '$timestamp' },
          lastVisit: { $first: '$timestamp' },
          pageCount: { $sum: 1 },
          pages: { $addToSet: '$page' },
        },
      },
      {
        $facet: {
          visitors: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                ip: 1,
                userAgent: 1,
                firstVisit: 1,
                lastVisit: 1,
                pageCount: 1,
                pages: { $slice: ['$pages', 10] },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]).allowDiskUse(true);

    const visitors = result?.visitors || [];
    const total = result?.total?.[0]?.count || 0;

    res.json({
      visitors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching visitor list:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;