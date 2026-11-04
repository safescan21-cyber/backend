// GET /api/geo: the visitor's state code, for Nova's greeting (cities are too often wrong). Looked up on this server from a local
// database (no outside service), and neither the address nor the result is stored.
const router = require("express").Router();
const geoip = require("geoip-lite");

router.get("/", (req, res) => {
  const hit = geoip.lookup(req.ip);
  res.set("Cache-Control", "private, no-store");
  res.json({ region: hit?.region || "", country: hit?.country || "" });
});

module.exports = router;
