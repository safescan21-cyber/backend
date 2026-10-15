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

module.exports = { pingIndexNow, INDEXNOW_KEY: KEY };
