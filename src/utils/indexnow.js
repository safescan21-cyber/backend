// IndexNow: tells Bing, Yandex, Seznam and others that a page changed, so new
// articles and products get crawled within minutes instead of days.
// The key is public by design; the matching file is served at
// https://www.foodpharmamachinery.com/<key>.txt (frontend/sonu/public).
const SITE = "https://www.foodpharmamachinery.com";
const KEY = process.env.INDEXNOW_KEY || "4abb4644a05433712c6848f5a3d6c3a7";

const pingIndexNow = (paths = []) => {
  const urlList = paths.filter(Boolean).map((p) => (p.startsWith("http") ? p : `${SITE}${p}`));
  if (!urlList.length || process.env.NODE_ENV !== "production") return; // only from the live server
  fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: "www.foodpharmamachinery.com", key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
  })
    .then((r) => console.log(`IndexNow: ${r.status} for ${urlList.length} URL(s)`))
    .catch((err) => console.warn("IndexNow ping failed:", err.message));
};

// Every page a shop machine appears on, for pinging when it is added, changed or removed:
// its own page in each country version, the shop, /products and its category page, and the
// pharma / food machinery pages (their machine lists come from the shop)
const COUNTRY_VERSIONS = ["", "/en-us", "/en-gb", "/en-au", "/fr", "/ja", "/ko", "/ur", "/hi"]; // frontend-next src/i18n/locales.js
// Shop category -> its /products/<page> on the website (frontend-next productCategoryData.js)
const CATEGORY_PAGE = {
  "tablet-press": "tablet-press", tooling: "tablet-press", "capsule-filling": "capsule-filling",
  "blister-packaging": "blister-packaging", "liquid-filling": "liquid-filling", "powder-filling": "powder-filling",
  cartoning: "cartoning", labeling: "labeling", coating: "coating",
  granulation: "granulation", mixing: "granulation", "fluid-bed-dryer": "granulation", milling: "granulation",
  inspection: "inspection", "metal-detector": "inspection", checkweigher: "inspection",
  "aseptic-filling": "aseptic-filling", cleanroom: "cleanroom", sterile: "cleanroom",
};
const productPaths = (product) => {
  if (!product?._id) return [];
  const page = CATEGORY_PAGE[product.category];
  return [
    ...COUNTRY_VERSIONS.map((c) => `${c}/shop/${product._id}`),
    "/shop",
    "/products",
    page && `/products/${page}`,
    "/pharma-machinery",
    "/food-machinery",
  ].filter(Boolean);
};

module.exports = { pingIndexNow, productPaths, INDEXNOW_KEY: KEY };
