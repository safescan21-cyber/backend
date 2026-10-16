// Tiny in-memory cache for public GET endpoints that rarely change.
// The database plan allows only ~100 operations/second, so answering repeat
// requests from memory keeps the site fast under load.
// Any write (POST/PUT/PATCH/DELETE) through a router using clearOnWrite()
// empties the cache, so admins see their changes immediately.
const store = new Map();
const MAX_ENTRIES = 500;

const hasLogin = (req) => Boolean(req.headers.authorization || req.cookies?.token);

// Caches successful JSON responses for anonymous visitors only
// (logged-in admins can see extra data, e.g. inactive press releases).
const cacheGet = (ttlMs = 30000) => (req, res, next) => {
  if (req.method !== "GET" || hasLogin(req)) return next();
  const key = req.originalUrl;
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    res.set("X-Cache", "HIT");
    return res.status(hit.status).json(hit.body);
  }
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200) {
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
      store.set(key, { status: 200, body, expires: Date.now() + ttlMs });
    }
    res.set("X-Cache", "MISS");
    return json(body);
  };
  next();
};

const clearCache = () => store.clear();

const clearOnWrite = (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") clearCache();
  next();
};

module.exports = { cacheGet, clearCache, clearOnWrite };
