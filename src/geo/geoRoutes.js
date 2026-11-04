// Nova's greeting. Both are worked out on this server from local data (no outside service), and
// neither the address, the position nor the result is stored.
//   GET  /api/geo        the visitor's state code from the internet address (cities are too often wrong)
//   POST /api/geo/near   { lat, lon } the nearest Indian city, when the visitor shares their position
const router = require("express").Router();
const geoip = require("geoip-lite");
const cities = require("all-the-cities").filter((c) => c.country === "IN");

const MAX_KM = 50;

router.get("/", (req, res) => {
  const hit = geoip.lookup(req.ip);
  res.set("Cache-Control", "private, no-store");
  res.json({ region: hit?.region || "", country: hit?.country || "" });
});

router.post("/near", (req, res) => {
  const lat = Number(req.body?.lat);
  const lon = Number(req.body?.lon);
  res.set("Cache-Control", "private, no-store");
  if (!(lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98)) return res.json({ city: "" }); // outside India
  const scale = Math.cos((lat * Math.PI) / 180);
  let best = null;
  let bestDistance = Infinity;
  for (const c of cities) {
    const [cityLon, cityLat] = c.loc.coordinates;
    const distance = (cityLat - lat) ** 2 + ((cityLon - lon) * scale) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = c; }
  }
  const km = Math.sqrt(bestDistance) * 111;
  const city = best && km <= MAX_KM ? best.name.normalize("NFD").replace(/[̀-ͯ]/g, "") : "";
  res.json({ city });
});

module.exports = router;
