// GET /api/geo: the visitor's rough city, for Nova's greeting. Looked up on this server from a local
// database (no outside service), and neither the address nor the result is stored.
const router = require("express").Router();
const geoip = require("geoip-lite");

router.get("/", (req, res) => {
  const hit = geoip.lookup(req.ip);
  res.set("Cache-Control", "private, no-store");
  res.json({ city: hit?.city || "", country: hit?.country || "" });
});

module.exports = router;
