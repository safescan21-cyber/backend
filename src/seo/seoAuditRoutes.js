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

module.exports = router;
