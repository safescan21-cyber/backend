// Small in-memory limiter: true when `key` (e.g. "newsletter:<ip>") has been
// seen more than `max` times in the last `windowMs`. Resets on restart, which
// is fine for stopping scripted floods from one address.
const buckets = new Map();

const tooMany = (key, max, windowMs) => {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 20000) buckets.clear(); // never grow without bound
  return recent.length > max;
};

module.exports = { tooMany };
