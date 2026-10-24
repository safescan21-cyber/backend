// Continuous SEO: every Monday 8:00 India time the live server checks every page in the
// sitemap (status, title, description, H1, canonical, noindex, image alt texts, speed),
// emails a report to SEO_REPORT_TO (default safescan21@gmail.com) and tells IndexNow
// (Bing, Yandex…) about all pages again. Admin can also run it now (POST /api/seo/audit).
const nodemailer = require("nodemailer");
const { JobMarker } = require("../soldMachines/SoldMachine");
const { pingIndexNow } = require("../utils/indexnow");

const SITE = "https://www.foodpharmamachinery.com";
const MARKER = "seo-weekly-audit";
const LOCALES = /^https:\/\/www\.foodpharmamachinery\.com\/(en-us|en-gb|fr|ja|ko|ur)(\/|$)/;

const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const attr = (tag, name) => (tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i")) || [])[1];
const metaContent = (html, key, value) => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) if ((attr(tag, key) || "").toLowerCase() === value) return decode(attr(tag, "content"));
  return null;
};

// One page → { url, status, ms, title, issues: [{ level: 'error'|'warning', text }] }
const checkPage = async (url) => {
  const issues = [];
  const add = (level, text) => issues.push({ level, text });
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "FoodPharmaSEOCheck/1.0 (+weekly self-check)" }, signal: AbortSignal.timeout(25000) });
  } catch (err) {
    return { url, status: 0, ms: Date.now() - started, title: "", issues: [{ level: "error", text: `Page did not answer (${err.name === "TimeoutError" ? "timeout" : err.message})` }] };
  }
  const html = res.status === 200 ? await res.text() : "";
  const ms = Date.now() - started;
  if (res.status >= 300 && res.status < 400) add("error", `Redirects (${res.status}) – the sitemap should list the final address`);
  else if (res.status !== 200) add("error", `HTTP ${res.status}`);
  if (!html) return { url, status: res.status, ms, title: "", issues };

  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  if (!title) add("error", "No page title");
  else if (title.length > 65) add("warning", `Title is long (${title.length} characters; Google shows about 60)`);
  else if (title.length < 15) add("warning", `Title is very short (${title.length} characters)`);

  const desc = metaContent(html, "name", "description");
  if (!desc) add("error", "No meta description");
  else if (desc.length > 165) add("warning", `Description is long (${desc.length} characters; Google shows about 155)`);
  else if (desc.length < 50) add("warning", `Description is short (${desc.length} characters)`);

  const robots = (metaContent(html, "name", "robots") || "").toLowerCase();
  if (robots.includes("noindex")) add("error", "Marked noindex but listed in the sitemap");

  const canonical = ((html.match(/<link\b[^>]*rel="canonical"[^>]*>/i) || [])[0] || "");
  const href = attr(canonical, "href");
  if (!href) add("warning", "No canonical link");
  else if (href.replace(/\/$/, "") !== url.replace(/\/$/, "")) add("warning", `Canonical points elsewhere: ${href}`);

  const h1 = (html.match(/<h1\b/gi) || []).length;
  if (h1 === 0) add("warning", "No H1 heading");
  else if (h1 > 1) add("warning", `${h1} H1 headings (one is best)`);

  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((t) => !/\balt\s*=/i.test(t)).length;
  if (noAlt) add("warning", `${noAlt} image(s) without alt text`);

  if (!/application\/ld\+json/i.test(html)) add("warning", "No structured data (JSON-LD)");
  if (ms > 4000) add("warning", `Slow: ${(ms / 1000).toFixed(1)} s`);
  return { url, status: res.status, ms, title, issues };
};

const runAudit = async ({ limit = 400 } = {}) => {
  const xml = await fetch(`${SITE}/sitemap.xml`, { signal: AbortSignal.timeout(20000) }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
  const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
  // The main (India/English) pages; the language copies share their templates
  const urls = all.filter((u) => !LOCALES.test(u)).slice(0, limit);
  const site = [];
  if (!all.length) site.push({ level: "error", text: "sitemap.xml could not be read or is empty" });
  const robotsTxt = await fetch(`${SITE}/robots.txt`, { signal: AbortSignal.timeout(15000) }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
  if (!/sitemap:/i.test(robotsTxt)) site.push({ level: "warning", text: "robots.txt has no Sitemap line" });

  const pages = [];
  for (let i = 0; i < urls.length; i += 3) pages.push(...(await Promise.all(urls.slice(i, i + 3).map(checkPage))));
  const errors = pages.reduce((n, p) => n + p.issues.filter((x) => x.level === "error").length, 0) + site.filter((x) => x.level === "error").length;
  const warnings = pages.reduce((n, p) => n + p.issues.filter((x) => x.level === "warning").length, 0) + site.filter((x) => x.level === "warning").length;
  const avgMs = pages.length ? Math.round(pages.reduce((s, p) => s + p.ms, 0) / pages.length) : 0;
  return { checkedAt: new Date().toISOString(), sitemapUrls: all.length, checked: pages.length, errors, warnings, avgMs, site, pages, allUrls: all };
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const reportTo = () => process.env.SEO_REPORT_TO || process.env.SOLD_REPORT_TO || "safescan21@gmail.com";

const emailReport = async (r) => {
  const user = process.env.SMTP_USER;
  if (!user || !process.env.SMTP_PASS) throw new Error("SMTP is not set up");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass: process.env.SMTP_PASS },
  });
  const withIssues = r.pages.filter((p) => p.issues.length);
  const rows = withIssues.slice(0, 150).map((p) => `
    <tr><td style="padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top;"><a href="${esc(p.url)}">${esc(p.url.replace(SITE, "") || "/")}</a></td>
    <td style="padding:6px 8px;border-bottom:1px solid #eee;">${p.issues.map((x) => `<span style="color:${x.level === "error" ? "#b91c1c" : "#92400e"}">${x.level === "error" ? "●" : "○"} ${esc(x.text)}</span>`).join("<br/>")}</td></tr>`).join("");
  const date = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  await transport.sendMail({
    from: process.env.SMTP_FROM || `"Food Pharma Machinery" <${user}>`,
    to: reportTo(),
    subject: `SEO check ${date}: ${r.errors} error(s), ${r.warnings} warning(s) on ${r.checked} pages`,
    text: `SEO check ${date}\nPages checked: ${r.checked} (sitemap: ${r.sitemapUrls})\nErrors: ${r.errors}, warnings: ${r.warnings}\nAverage load: ${(r.avgMs / 1000).toFixed(1)} s\n\n` +
      withIssues.map((p) => `${p.url}\n${p.issues.map((x) => `  - ${x.level}: ${x.text}`).join("\n")}`).join("\n\n"),
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;max-width:760px">
      <h2 style="margin:0 0 6px">Weekly SEO check</h2>
      <p style="margin:0 0 12px;color:#555">${esc(date)} · ${r.checked} pages checked (sitemap lists ${r.sitemapUrls} incl. language versions) · average load ${(r.avgMs / 1000).toFixed(1)} s</p>
      <p><strong style="color:#b91c1c">${r.errors} error(s)</strong> · <strong style="color:#92400e">${r.warnings} warning(s)</strong>${r.site.length ? `<br/>${r.site.map((x) => esc(x.text)).join("<br/>")}` : ""}</p>
      ${withIssues.length ? `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px">${rows}</table>${withIssues.length > 150 ? `<p>…and ${withIssues.length - 150} more pages.</p>` : ""}` : "<p>No problems found on any page. 🎉</p>"}
      <p style="color:#666;font-size:12px">All ${r.sitemapUrls} sitemap pages were also sent to IndexNow (Bing, Yandex and others) so they are re-crawled. Run the check any time in Admin → SEO Health.</p></div>`,
  });
};

// Weekly run (claims the week in the database so it happens once, also after restarts)
const weekKey = () => {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
  return monday.toISOString().slice(0, 10);
};
const runWeeklyIfDue = async () => {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  if (ist.getUTCDay() !== 1 || ist.getUTCHours() < 8) return null; // Monday from 8:00
  const week = weekKey();
  const claimed = await JobMarker.findOneAndUpdate({ _id: MARKER, value: { $ne: week } }, { $set: { value: week, at: new Date() } }, { returnDocument: "before" }).lean();
  if (!claimed) {
    if (await JobMarker.exists({ _id: MARKER })) return null;
    try { await JobMarker.create({ _id: MARKER, value: week, at: new Date() }); } catch { return null; }
  }
  const r = await runAudit();
  try {
    await emailReport(r);
  } catch (err) {
    console.error("[seo-audit] email failed:", err.message);
  }
  pingIndexNow(r.allUrls);
  console.log(`[seo-audit] ${r.checked} pages, ${r.errors} errors, ${r.warnings} warnings`);
  return r;
};

let timer = null;
const startSeoAudit = () => {
  if (process.env.NODE_ENV !== "production" || timer) return;
  const run = () => runWeeklyIfDue().catch((err) => console.error("[seo-audit] failed:", err.message));
  setTimeout(run, 5 * 60 * 1000);
  timer = setInterval(run, 30 * 60 * 1000);
  timer.unref?.();
};

module.exports = { runAudit, emailReport, startSeoAudit, checkPage, reportTo };
