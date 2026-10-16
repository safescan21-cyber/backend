// Demo products for testing the shop: real machinery photos and videos from
// Wikimedia Commons (free licences, credited in each description), uploaded to
// Cloudinary under demo-products/.
//
//   node scripts/seed-demo-products.js            add the demo products (skips ones already there)
//   node scripts/seed-demo-products.js --remove   delete every demo product and its Cloudinary files
//
// Demo products are recognised by their Cloudinary folder, so --remove never
// touches real products. The sitemap leaves them out as well.
require("dotenv").config();
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const Products = require("../src/products/productsmodel");
const User = require("../src/users/Usermodel");

const FOLDER = "demo-products";
const DEMO_MATCH = new RegExp(`/${FOLDER}/`);
const UA = "FoodPharmaMachineryDemoSeed/1.0 (https://www.foodpharmamachinery.com)";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Commons file titles. "frame:<video>:<sec>" = a still taken from that video.
const V_ROTARY = "Video einer Rundläuferpresse an der Uni Tübingen, in Betrieb 02.webm";
const V_ECCENTRIC = "Video einer Exzenterpresse an der Uni Tübingen, in Betrieb.webm";
const V_AEROSOL = "Pamasol aerosol filling machine.webm";
const V_VACUUM = "Vacuum Packaging Machine.webm";
const V_PACKAGING = "Packaging - manual and machine.webm";

const PRODUCTS = [
  {
    name: "Rotary Tablet Press – 16 Station (D Tooling)",
    category: "tablet-press", price: 850000, oldPrice: 975000, stock: 3, warranty: 24, readyToDispatch: true, origin: "germany",
    images: [`frame:${V_ROTARY}:2`, `frame:${V_ROTARY}:4`, "McFerran rotary tablet press 1874.png"],
    videos: [V_ROTARY],
    description: "High-output rotary tablet press for pharmaceutical and nutraceutical tablets. Double-sided compression, cGMP stainless steel contact parts, touchscreen HMI with batch reports and automatic lubrication.",
    specifications: [["Stations", "16 (D tooling)"], ["Output", "Up to 28,800 tablets/hour"], ["Max. compression force", "60 kN"], ["Max. tablet diameter", "25 mm"], ["Motor", "3 HP, 415 V, 3 phase"]],
  },
  {
    name: "Single Punch Tablet Press – Eccentric",
    category: "tablet-press", price: 185000, oldPrice: 210000, stock: 8, warranty: 12, readyToDispatch: true, origin: "india",
    images: [`frame:${V_ECCENTRIC}:3`, "Hand tablet press in exposition History of making of drugs in Kuks Hospital in Kuks, Trutnov District.jpg"],
    videos: [V_ECCENTRIC],
    description: "Compact eccentric tablet press for R&D labs, pilot batches and training. Quick die change, adjustable fill depth and tablet hardness.",
    specifications: [["Output", "Up to 3,600 tablets/hour"], ["Max. pressure", "15 tonnes"], ["Max. tablet diameter", "20 mm"], ["Weight", "120 kg"]],
  },
  {
    name: "Automatic Capsule Filling Machine – NJP 1200",
    category: "capsule-filling", price: 1250000, oldPrice: 1400000, stock: 2, warranty: 24, origin: "india",
    images: ["Verkapselung0652.jpg", "Verkapselung652.jpg"],
    videos: [],
    description: "Fully automatic hard gelatin capsule filler for powders and pellets. Fills sizes 00–5 with accurate dosing discs, vacuum separation and rejection of empty capsules.",
    specifications: [["Output", "72,000 capsules/hour"], ["Capsule sizes", "00, 0, 1, 2, 3, 4, 5"], ["Filling accuracy", "±2%"], ["Power", "5.5 kW"]],
  },
  {
    name: "Blister Packing Machine – Alu-PVC / Alu-Alu",
    category: "blister-packaging", price: 1400000, stock: 1, warranty: 24, origin: "india",
    images: ["Ayursun Pharma Blister machine division.jpg", `frame:${V_PACKAGING}:20`],
    videos: [V_PACKAGING],
    description: "Flat-plate blister packing machine for tablets and capsules with forming, filling, sealing, batch coding and cutting in one line. Change parts for multiple blister sizes.",
    specifications: [["Speed", "Up to 40 cuts/min"], ["Forming area", "250 × 120 mm"], ["Materials", "PVC, PVDC, Alu-Alu"], ["Air", "6 bar, 0.4 m³/min"]],
  },
  {
    name: "Fluid Bed Dryer – 60 kg (GMP)",
    category: "fluid-bed-dryer", price: 675000, oldPrice: 720000, stock: 0, warranty: 12, origin: "india",
    images: ["Fluidised Bed Dryer.jpeg"],
    videos: [],
    description: "Fluid bed dryer for wet granules with steam or electric heating, HEPA-filtered inlet air and finger bags. Out of stock – shown to test the out-of-stock state.",
    specifications: [["Batch size", "60 kg"], ["Heating", "Steam / electric"], ["Temperature range", "Ambient to 80 °C"], ["Contact parts", "SS 316L"]],
  },
  {
    name: "Aerosol Filling & Crimping Machine",
    category: "liquid-filling", price: 920000, stock: 2, warranty: 12, origin: "germany",
    images: [`frame:${V_AEROSOL}:10`, `frame:${V_AEROSOL}:40`],
    videos: [V_AEROSOL],
    description: "Semi-automatic aerosol line that fills, crimps and gasses spray cans for pharmaceutical, cosmetic and food sprays.",
    specifications: [["Output", "Up to 1,200 cans/hour"], ["Can diameter", "35–76 mm"], ["Fill volume", "10–1,000 ml"], ["Drive", "Pneumatic"]],
  },
  {
    name: "Automatic Bottle Filling Machine – 4 Head",
    category: "liquid-filling", price: 340000, oldPrice: 380000, stock: 5, warranty: 12, readyToDispatch: true, origin: "india",
    images: ["Bottle Filling Machine.jpg"],
    videos: [],
    description: "Volumetric piston filler for syrups, suspensions and oils. Four nozzles with drip-free filling and no-bottle-no-fill sensors.",
    specifications: [["Heads", "4"], ["Output", "Up to 60 bottles/min"], ["Fill range", "10–500 ml"], ["Accuracy", "±1%"]],
  },
  {
    name: "Tube Filling & Sealing Machine",
    category: "liquid-filling", price: 560000, stock: 4, warranty: 12, origin: "india",
    images: ["Tube Filling Machine.jpg"],
    videos: [],
    description: "Automatic filler and sealer for creams, ointments and gels in plastic or laminated tubes, with hot-air sealing and batch coding.",
    specifications: [["Output", "Up to 40 tubes/min"], ["Tube diameter", "10–50 mm"], ["Fill range", "5–250 g"], ["Sealing", "Hot air"]],
  },
  {
    name: "Double Chamber Vacuum Packaging Machine",
    category: "packaging-accessories", price: 125000, stock: 10, warranty: 12, readyToDispatch: true, origin: "india",
    images: [`frame:${V_VACUUM}:15`, `frame:${V_VACUUM}:45`],
    videos: [V_VACUUM],
    description: "Double chamber vacuum packer for food, medical devices and spare parts. One chamber seals while the other loads.",
    specifications: [["Chambers", "2"], ["Seal length", "2 × 600 mm"], ["Pump", "63 m³/h"], ["Cycle time", "15–30 s"]],
  },
  {
    name: "Z-Blade Sigma Mixer – 100 L",
    category: "mixing", price: 295000, stock: 3, warranty: 12, origin: "india",
    images: ["Z blade kneader.jpg"],
    videos: [],
    description: "Sigma (Z-blade) kneader for heavy pastes, doughs and wet masses, with hydraulic tilting for easy discharge.",
    specifications: [["Working capacity", "100 L"], ["Blade speed", "28/16 rpm"], ["Motor", "10 HP"], ["Contact parts", "SS 304"]],
  },
  {
    name: "Analytical Balance – 220 g × 0.1 mg",
    category: "lab-equipment", price: 78000, oldPrice: 85000, stock: 15, warranty: 24, readyToDispatch: true, origin: "germany",
    images: ["Analytical balance & old weighing scales.JPG"],
    videos: [],
    description: "Laboratory analytical balance with draft shield, internal calibration and USB/RS-232 output for GLP reports.",
    specifications: [["Capacity", "220 g"], ["Readability", "0.1 mg"], ["Pan size", "Ø 90 mm"], ["Calibration", "Internal, automatic"]],
  },
];

const commonsTitles = () => {
  const t = new Set();
  for (const p of PRODUCTS) for (const m of [...p.images, ...p.videos]) t.add(m.startsWith("frame:") ? m.split(":")[1] : m);
  return [...t];
};

// URLs (1600px for photos, original for videos) and credits for every Commons file
const fetchCommonsInfo = async (titles) => {
  const info = {};
  for (let i = 0; i < titles.length; i += 40) {
    const params = new URLSearchParams({
      action: "query", format: "json", prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "1600",
      iiextmetadatafilter: "LicenseShortName|Artist", titles: titles.slice(i, i + 40).map((t) => `File:${t}`).join("|"),
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Commons API ${res.status}`);
    const data = await res.json();
    for (const page of Object.values(data.query.pages)) {
      const ii = page.imageinfo?.[0];
      if (!ii) throw new Error(`Missing on Commons: ${page.title}`);
      const meta = ii.extmetadata || {};
      info[page.title.slice(5)] = {
        isVideo: ii.mime.startsWith("video/") || ii.mime === "application/ogg",
        url: ii.mime.startsWith("image/") && ii.thumburl ? ii.thumburl : ii.url,
        artist: String(meta.Artist?.value || "").replace(/<[^>]+>/g, "").trim().split("\n")[0].slice(0, 60) || "Unknown",
        license: meta.LicenseShortName?.value || "see Commons",
      };
    }
  }
  return info;
};

const slug = (s) => s.normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60);

const uploadFromCommons = async (title, meta) => {
  const res = await fetch(meta.url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${title}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: FOLDER,
          public_id: slug(title),
          overwrite: true,
          resource_type: meta.isVideo ? "video" : "image",
          ...(meta.isVideo && { eager: [{ format: "mp4" }, { format: "jpg", start_offset: 1 }] }),
        },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      .end(buffer);
  });
};

const seed = async () => {
  const admin = await User.findOne({ role: "admin" }).select("_id email").lean();
  if (!admin) throw new Error("No admin user found to own the demo products");

  const existing = new Set((await Products.find({ images: DEMO_MATCH }).select("name").lean()).map((p) => p.name));
  const todo = PRODUCTS.filter((p) => !existing.has(p.name));
  if (!todo.length) return console.log(`All ${PRODUCTS.length} demo products already exist.`);

  console.log("Looking up media on Wikimedia Commons…");
  const info = await fetchCommonsInfo(commonsTitles());

  const uploaded = {};
  const upload = async (title) => {
    if (!uploaded[title]) {
      process.stdout.write(`  uploading ${title.slice(0, 70)}… `);
      uploaded[title] = await uploadFromCommons(title, info[title]);
      console.log("ok");
    }
    return uploaded[title];
  };

  for (const p of todo) {
    const images = [];
    for (const m of p.images) {
      if (m.startsWith("frame:")) {
        const [, title, sec] = m.split(":");
        const v = await upload(title);
        images.push(cloudinary.url(v.public_id, { resource_type: "video", start_offset: sec, width: 1200, crop: "limit", format: "jpg", secure: true }));
      } else {
        images.push((await upload(m)).secure_url);
      }
    }
    const videos = [];
    for (const v of p.videos) videos.push((await upload(v)).secure_url.replace(/\.\w+$/, ".mp4"));

    const credits = [...new Set([...p.images, ...p.videos].map((m) => (m.startsWith("frame:") ? m.split(":")[1] : m)))]
      .map((t) => `${info[t].isVideo ? "Video" : "Photo"}: ${info[t].artist}, ${info[t].license}, via Wikimedia Commons`);

    const doc = await Products.create({
      name: p.name,
      category: p.category,
      description: `${p.description}\n\nDEMO PRODUCT for testing the shop – not for sale.\n${credits.join("\n")}`,
      price: p.price,
      oldPrice: p.oldPrice,
      images,
      videos,
      color: "silver",
      origin: p.origin,
      productType: "machine",
      author: admin._id,
      warranty: p.warranty,
      stock: p.stock,
      readyToDispatch: !!p.readyToDispatch,
      specifications: p.specifications.map(([key, value]) => ({ key, value })),
    });
    console.log(`✓ ${doc.name}  →  /shop/${doc._id}`);
  }
};

const remove = async () => {
  const demo = await Products.find({ images: DEMO_MATCH }).select("_id name").lean();
  await Products.deleteMany({ _id: { $in: demo.map((p) => p._id) } });
  console.log(`Removed ${demo.length} demo products.`);
  for (const type of ["image", "video"]) {
    await cloudinary.api.delete_resources_by_prefix(`${FOLDER}/`, { resource_type: type }).catch((e) => console.warn(`Cloudinary ${type} cleanup:`, e.message || e));
  }
  console.log("Removed demo files from Cloudinary.");
};

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => (process.argv.includes("--remove") ? remove() : seed()))
  .catch((err) => {
    console.error("✗", err.message || err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
