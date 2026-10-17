// GET /p/:id — share page for a product (see below).
// GET /sitemap-content.xml — press articles and products, built live from the
// database, so new content is listed without redeploying the website.
// nginx on www.foodpharmamachinery.com proxies this path to the API.
const router = require("express").Router();

// GET /seo-shell/shop/:id and /seo-shell/press/:id — pages with their own SEO tags (see pageShells.js)
router.use(require("./pageShells"));
const PressRelease = require("../press/PressRelease");
const Products = require("../products/productsmodel");
const PharmaApi = require("../pharmaApi/PharmaApi");

const SITE = "https://www.foodpharmamachinery.com";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const day = (d) => new Date(d || Date.now()).toISOString().slice(0, 10);

router.get("/sitemap-content.xml", async (req, res) => {
  try {
    const [press, products, apis] = await Promise.all([
      PressRelease.find({ isActive: true }).select("_id updatedAt publishedDate").sort({ publishedDate: -1 }).limit(5000).lean(),
      // demo products stay out of Google
      Products.find({ images: { $not: /\/demo-products\// }, active: { $ne: false } }).select("_id updatedAt createdAt").limit(5000).lean(),
      PharmaApi.find({ active: true }).select("slug updatedAt").limit(5000).lean(),
    ]);
    const urls = [
      ...press.map((p) => ({ loc: `${SITE}/press/${p._id}`, lastmod: day(p.updatedAt || p.publishedDate), priority: "0.7" })),
      ...products.map((p) => ({ loc: `${SITE}/shop/${p._id}`, lastmod: day(p.updatedAt || p.createdAt), priority: "0.8" })),
      ...apis.map((a) => ({ loc: `${SITE}/pharma-api/${a.slug}`, lastmod: day(a.updatedAt), priority: "0.7" })),
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

// GET /p/:id — the link people share. Chat apps and social sites don't run
// JavaScript, so this page carries the product's own title, photo and price as
// Open Graph tags (rich preview card), then sends real visitors to /shop/:id.
// No meta refresh and og:url points here: Facebook follows both and would
// re-scrape the JavaScript-only /shop page, losing the preview.
// nginx proxies /p/ to the API.
const attr = (s) => esc(s).replace(/"/g, "&quot;");
const isId = (id) => /^[a-f0-9]{24}$/i.test(id);
const shareImage = (url) => {
  if (typeof url !== "string" || !url) return `${SITE}/favicon-192.png`;
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  // 1200×630 JPG: the size Facebook, LinkedIn and WhatsApp preview best
  const [head, tail] = url.split(marker);
  return `${head}${marker}c_pad,b_white,w_1200,h_630,q_auto,f_jpg/${tail.replace(/^([a-z]_[^/]+\/)+/i, "")}`;
};

router.get("/p/:id", async (req, res) => {
  const { id } = req.params;
  const target = `${SITE}/shop/${isId(id) ? id : ""}`;
  try {
    const p = isId(id)
      ? await Products.findById(id).select("name description price images category active").lean()
      : null;
    if (!p || p.active === false) return res.redirect(302, `${SITE}/shop`);

    const price = Number(p.price) > 0 ? `₹${Number(p.price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "";
    const title = `${p.name}${price ? ` – ${price}` : ""} | Food Pharma Machinery`;
    const desc = String(p.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200)
      || `${p.name} for pharma and food manufacturing. Price, specifications and quote.`;
    const image = shareImage(Array.isArray(p.images) ? p.images[0] : "");

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=600");
    res.send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${attr(target)}">
<meta name="robots" content="noindex, follow">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Food Pharma Machinery">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${attr(`${SITE}/p/${id}`)}">
<meta property="og:image" content="${attr(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(p.name)}">
${price ? `<meta property="product:price:amount" content="${Number(p.price)}">
<meta property="product:price:currency" content="INR">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(title)}">
<meta name="twitter:description" content="${attr(desc)}">
<meta name="twitter:image" content="${attr(image)}">
<script>location.replace(${JSON.stringify(target)});</script>
</head><body style="font-family:system-ui,sans-serif;text-align:center;padding:40px">
<p>Opening <a href="${attr(target)}">${esc(p.name)}</a>…</p>
</body></html>`);
  } catch (error) {
    console.error("Share page error:", error);
    res.redirect(302, target);
  }
});

module.exports = router;
