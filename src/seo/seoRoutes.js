// GET /sitemap-content.xml — press articles and products, built live from the
// database, so new content is listed without redeploying the website.
// nginx on www.foodpharmamachinery.com proxies this path to the API.
const router = require("express").Router();
const PressRelease = require("../press/PressRelease");
const Products = require("../products/productsmodel");

const SITE = "https://www.foodpharmamachinery.com";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const day = (d) => new Date(d || Date.now()).toISOString().slice(0, 10);

router.get("/sitemap-content.xml", async (req, res) => {
  try {
    const [press, products] = await Promise.all([
      PressRelease.find({ isActive: true }).select("_id updatedAt publishedDate").sort({ publishedDate: -1 }).limit(5000).lean(),
      Products.find({}).select("_id updatedAt createdAt").limit(5000).lean(),
    ]);
    const urls = [
      ...press.map((p) => ({ loc: `${SITE}/press/${p._id}`, lastmod: day(p.updatedAt || p.publishedDate), priority: "0.7" })),
      ...products.map((p) => ({ loc: `${SITE}/shop/${p._id}`, lastmod: day(p.updatedAt || p.createdAt), priority: "0.8" })),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${esc(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n")}
</urlset>
`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error("Sitemap error:", error);
    res.status(500).set("Content-Type", "text/plain").send("Sitemap temporarily unavailable");
  }
});

module.exports = router;
