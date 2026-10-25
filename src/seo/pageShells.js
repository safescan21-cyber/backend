// Product and press pages with their own SEO tags in the raw HTML.
//
// The website is a React app: without this, every /shop/:id and /press/:id URL
// returns the same generic index.html, so crawlers that don't run JavaScript
// (Bing, link previews, AI search) see the home page's title on every product.
// nginx sends those two URL patterns here; we take the built index.html and fill
// in the title, description, canonical URL, social tags, structured data and a
// plain-HTML copy of the content. React replaces all of it when the app loads
// (main.jsx removes [data-prerender] tags; createRoot clears #root).
//
// If anything fails nginx falls back to the normal index.html (5xx responses).
const fs = require("fs");
const router = require("express").Router();
const Products = require("../products/productsmodel");
const PressRelease = require("../press/PressRelease");

const SITE = "https://www.foodpharmamachinery.com";
const SITE_NAME = "Food Pharma Machinery";
const SHELL_PATH = process.env.SITE_SHELL_PATH || "/var/www/foodpharma/index.html";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);
const isId = (id) => /^[a-f0-9]{24}$/i.test(id);
const inr = (n) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// Re-read the shell only when a new build replaces it
let shellCache = { mtimeMs: 0, html: "" };
const readShell = () => {
  const { mtimeMs } = fs.statSync(SHELL_PATH);
  if (mtimeMs !== shellCache.mtimeMs) shellCache = { mtimeMs, html: fs.readFileSync(SHELL_PATH, "utf8") };
  return shellCache.html;
};

const setMeta = (html, attr, key, value) =>
  html.replace(new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`), `$1${esc(value)}$2`);

const renderShell = ({ title, description, url, image, type = "website", jsonLd, noindex = false, body = "" }) => {
  let html = readShell()
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    // canonical/og:url never exist in the fallback shell, but drop them in case that changes
    .replace(/<link\s+rel="canonical"[^>]*>/g, "")
    .replace(/<meta\s+(property="og:url"|name="twitter:url"|name="robots")[^>]*>/g, "");
  html = setMeta(html, "name", "description", description);
  for (const [attr, key] of [["property", "og:title"], ["name", "twitter:title"]]) html = setMeta(html, attr, key, title);
  for (const [attr, key] of [["property", "og:description"], ["name", "twitter:description"]]) html = setMeta(html, attr, key, description);
  if (image) for (const [attr, key] of [["property", "og:image"], ["name", "twitter:image"]]) html = setMeta(html, attr, key, image);
  html = setMeta(html, "property", "og:type", type);

  const head = [
    `<link rel="canonical" href="${esc(url)}" data-prerender />`,
    `<meta property="og:url" content="${esc(url)}" data-prerender />`,
    `<meta name="twitter:url" content="${esc(url)}" data-prerender />`,
    noindex ? `<meta name="robots" content="noindex, follow" data-prerender />` : "",
    ...(jsonLd || []).map((d) => `<script type="application/ld+json" data-prerender>${JSON.stringify(d).replace(/</g, "\\u003c")}</script>`),
  ].filter(Boolean).join("");
  return html.replace("</head>", `${head}</head>`).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
};

// Plain HTML copy of the page for crawlers (visible for a moment before the app loads)
const box = (inner) =>
  `<main style="max-width:960px;margin:0 auto;padding:110px 16px 40px;font-family:system-ui,sans-serif;color:#1f2937;line-height:1.6">${inner}</main>`;
const crumbs = (items) =>
  `<nav aria-label="Breadcrumb" style="font-size:14px;color:#6b7280">${items
    .map(([name, href]) => (href ? `<a href="${esc(href)}">${esc(name)}</a>` : esc(name)))
    .join(" › ")}</nav>`;
const breadcrumbLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, ...(href && { item: `${SITE}${href}` }) })),
});

const send = (res, status, html) => {
  res.status(status).set("Content-Type", "text/html; charset=utf-8").set("Cache-Control", "no-cache").send(html);
};

const notFound = (res, what) =>
  send(res, 404, renderShell({
    title: `${what} not found | ${SITE_NAME}`,
    description: `This ${what.toLowerCase()} is no longer available. Browse pharma and food processing machinery at ${SITE_NAME}.`,
    url: `${SITE}/shop`,
    noindex: true,
  }));

// ── /shop/:id ──
router.get("/seo-shell/shop/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const p = isId(id)
      ? await Products.findById(id).select("name description metaDescription price oldPrice images category stock specifications").lean()
      : null;
    if (!p) return notFound(res, "Product");

    const url = `${SITE}/shop/${p._id}`;
    const text = plain(p.description);
    const categoryName = String(p.category || "").replace(/-/g, " ");
    const images = (p.images || []).filter((u) => typeof u === "string" && u).slice(0, 5);
    const price = Number(p.price) > 0 ? Number(p.price) : null;
    const inStock = Number(p.stock) > 0;
    const path = [["Home", "/"], ["Shop", "/shop"], [p.name, null]];

    const productLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      sku: String(p._id),
      brand: { "@type": "Brand", name: SITE_NAME },
      ...(images.length && { image: images }),
      ...(text && { description: clip(text, 500) }),
      ...(p.category && { category: categoryName }),
      ...(price && {
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "INR",
          price,
          availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@id": `${SITE}/#organization` },
        },
      }),
    };

    const specs = (p.specifications || []).filter((s) => s && s.key && s.value);
    const body = box(
      crumbs(path) +
      `<h1 style="font-size:28px;margin:12px 0">${esc(p.name)}</h1>` +
      (images[0] ? `<img src="${esc(images[0])}" alt="${esc(p.name)}" width="480" style="max-width:100%;height:auto;border-radius:12px" />` : "") +
      (price ? `<p style="font-size:22px;font-weight:700;color:#2563eb">${inr(price)}${p.oldPrice > price ? ` <s style="color:#9ca3af;font-size:16px">${inr(p.oldPrice)}</s>` : ""}</p>` : "") +
      `<p>${esc(categoryName)} · ${inStock ? "In stock" : "Out of stock"}</p>` +
      (text ? `<p>${esc(text)}</p>` : "") +
      (specs.length ? `<h2 style="font-size:20px">Specifications</h2><ul>${specs.map((s) => `<li><strong>${esc(s.key)}:</strong> ${esc(s.value)}</li>`).join("")}</ul>` : "") +
      `<p><a href="/bulk-quote?product=${encodeURIComponent(p.name)}&amp;id=${p._id}&amp;source=product">Request a bulk quote</a> · <a href="/shop">Browse all machines</a></p>`
    );

    send(res, 200, renderShell({
      title: `${p.name} | ${SITE_NAME}`, // same title the app sets
      description: p.metaDescription || clip(text || `${p.name} for pharma and food manufacturing. Price, specifications and quote from ${SITE_NAME}.`, 158),
      url,
      image: images[0],
      type: "product",
      jsonLd: [productLd, breadcrumbLd(path)],
      body,
    }));
  } catch (error) {
    console.error("SEO shell (product) error:", error.message);
    res.status(503).send("Temporarily unavailable"); // nginx serves the normal index.html instead
  }
});

// ── /press/:id ──
router.get("/seo-shell/press/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const a = isId(id)
      ? await PressRelease.findOne({ _id: id, isActive: true }).select("title summary content publishedDate updatedAt media").lean()
      : null;
    if (!a) return notFound(res, "Article");

    const url = `${SITE}/press/${a._id}`;
    const text = plain(a.content);
    const image = (a.media || []).find((m) => m && m.type === "image" && m.url)?.url;
    const path = [["Home", "/"], ["Press", "/press"], [a.title, null]];
    const articleLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: clip(a.title, 110),
      ...(image && { image: [image] }),
      datePublished: new Date(a.publishedDate || Date.now()).toISOString(),
      dateModified: new Date(a.updatedAt || a.publishedDate || Date.now()).toISOString(),
      mainEntityOfPage: url,
      author: { "@id": `${SITE}/#organization` },
      publisher: { "@id": `${SITE}/#organization` },
    };
    const body = box(
      crumbs(path) +
      `<h1 style="font-size:28px;margin:12px 0">${esc(a.title)}</h1>` +
      `<p style="color:#6b7280">${new Date(a.publishedDate || Date.now()).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>` +
      (image ? `<img src="${esc(image)}" alt="${esc(a.title)}" width="640" style="max-width:100%;height:auto;border-radius:12px" />` : "") +
      `<p>${esc(clip(text, 2000))}</p><p><a href="/press">More news</a></p>`
    );

    send(res, 200, renderShell({
      title: `${a.title} | ${SITE_NAME}`,
      description: clip(plain(a.summary) || text || a.title, 158),
      url,
      image,
      type: "article",
      jsonLd: [articleLd, breadcrumbLd(path)],
      body,
    }));
  } catch (error) {
    console.error("SEO shell (press) error:", error.message);
    res.status(503).send("Temporarily unavailable");
  }
});

module.exports = router;
