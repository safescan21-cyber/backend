// Nova's greeting. Both are worked out on this server from local data (no outside service), and
// neither the address, the position nor the result is stored.
//   GET  /api/geo        the visitor's state code from the internet address (cities are too often wrong)
//   POST /api/geo/near   { lat, lon } the nearest Indian city and state, when the visitor shares their position
const router = require("express").Router();
const geoip = require("geoip-lite");
const cities = require("all-the-cities").filter((c) => c.country === "IN");

const MAX_KM = 50;
// The city data's state numbers -> the state codes the website uses (utlis/regionNames.js)
const STATE = { "01": "AN", "02": "AP", "03": "AS", "05": "CH", "06": "DN", "07": "DL", "09": "GJ", 10: "HR", 11: "HP", 12: "JK", 13: "KL", 14: "LD", 16: "MH", 17: "MN", 18: "ML", 19: "KA", 20: "NL", 21: "OR", 22: "PY", 23: "PB", 24: "RJ", 25: "TN", 26: "TR", 28: "WB", 29: "SK", 30: "AR", 31: "MZ", 32: "DN", 33: "GA", 34: "BR", 35: "MP", 36: "UP", 37: "CT", 38: "JH", 39: "UT", 40: "TG", 41: "LA" };

router.get("/", (req, res) => {
  const hit = geoip.lookup(req.ip);
  res.set("Cache-Control", "private, no-store");
  res.json({ region: hit?.region || "", country: hit?.country || "" });
});

router.post("/near", (req, res) => {
  const lat = Number(req.body?.lat);
  const lon = Number(req.body?.lon);
  res.set("Cache-Control", "private, no-store");
  if (!(lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98)) return res.json({ city: "", region: "" }); // outside India
  const scale = Math.cos((lat * Math.PI) / 180);
  let best = null;
  let bestDistance = Infinity;
  for (const c of cities) {
    const [cityLon, cityLat] = c.loc.coordinates;
    const distance = (cityLat - lat) ** 2 + ((cityLon - lon) * scale) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = c; }
  }
  const km = Math.sqrt(bestDistance) * 111;
  if (!best || km > MAX_KM) return res.json({ city: "", region: "" });
  const city = best ? best.name.normalize("NFD").replace(/[̀-ͯ]/g, "") : "";
  res.json({ city, region: STATE[best.adminCode] || "" });
});

module.exports = router;
