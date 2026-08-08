// src/pages/ProductCategoryPage.jsx
import { useParams, Link } from "react-router-dom";

/* ─── Product Data – one object per category ─────────────── */
const PRODUCT_DATA = {
  "tablet-press": {
    title: "Tablet Press Machines",
    description: "High‑speed rotary and single‑punch tablet presses for pharma production.",
    products: [
      {
        name: "ZP-35D Rotary Press",
        images: [
          "https://placehold.co/400x300?text=ZP-35D+Angle+1",
          "https://placehold.co/400x300?text=ZP-35D+Angle+2",
        ],
        video: "https://www.youtube.com/embed/dQw4w9WgXcQ", // replace with real demo
        spec: "35 stations, 150k tabs/h",
      },
      {
        name: "ZP-41A High‑Speed",
        images: [
          "https://placehold.co/400x300?text=ZP-41A+Front",
          "https://placehold.co/400x300?text=ZP-41A+Side",
        ],
        video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        spec: "41 stations, 250k tabs/h",
      },
      {
        name: "THP-10 Single Punch",
        images: [
          "https://placehold.co/400x300?text=THP-10",
          "https://placehold.co/400x300?text=THP-10+Detail",
        ],
        video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        spec: "R&D / small batch",
      },
      {
        name: "ZPW-23 Multi‑Layer",
        images: [
          "https://placehold.co/400x300?text=ZPW-23+1",
          "https://placehold.co/400x300?text=ZPW-23+2",
        ],
        video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        spec: "Bilayer capable",
      },
      {
        name: "CPHI-55 GMP Press",
        images: [
          "https://placehold.co/400x300?text=CPHI-55+1",
          "https://placehold.co/400x300?text=CPHI-55+2",
        ],
        video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        spec: "Full containment",
      },
      {
        name: "MiniPress-II",
        images: [
          "https://placehold.co/400x300?text=MiniPress-II+1",
          "https://placehold.co/400x300?text=MiniPress-II+2",
        ],
        video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        spec: "Lab scale",
      },
    ],
  },
  // --------------------------------- other categories (shortened for brevity)
  "capsule-filling": {
    title: "Capsule Filling Machines",
    description: "Automatic capsule fillers for powders, pellets & liquids.",
    products: [
      { name: "NJP-1200C", images: ["https://placehold.co/400x300?text=NJP-1200C"], video: "", spec: "120k caps/h" },
      { name: "CFM-6000", images: ["https://placehold.co/400x300?text=CFM-6000"], video: "", spec: "Liquid fill capable" },
    ],
  },
  "blister-packaging": {
    title: "Blister Packaging Machines",
    description: "Thermoforming and cold‑form blister lines for tablets and capsules.",
    products: [
      { name: "BLM-350 Rotary", images: ["https://placehold.co/400x300?text=BLM-350"], video: "", spec: "350 blisters/min" },
    ],
  },
  "liquid-filling": {
    title: "Liquid Filling & Capping",
    description: "Volumetric and peristaltic filling lines for syrups, suspensions, and solutions.",
    products: [
      { name: "LF-4A Monoblock", images: ["https://placehold.co/400x300?text=LF-4A"], video: "", spec: "4 heads, up to 60 bpm" },
    ],
  },
  "powder-filling": {
    title: "Powder Filling Machines",
    description: "Auger‑based and vacuum‑type powder fillers for sterile and non‑sterile applications.",
    products: [
      { name: "AFS-2 Auger Filler", images: ["https://placehold.co/400x300?text=AFS-2"], video: "", spec: "Dual auger, 40 fills/min" },
    ],
  },
  "cartoning": {
    title: "Cartoning Machines",
    description: "Horizontal and vertical cartoners for pharma, nutraceutical, and cosmetic packaging.",
    products: [
      { name: "HC-200 Horizontal", images: ["https://placehold.co/400x300?text=HC-200"], video: "", spec: "200 cartons/min" },
    ],
  },
  "labeling": {
    title: "Labeling Machines",
    description: "Wrap‑around, top‑label, and print‑and‑apply labeling systems.",
    products: [
      { name: "LabelJet 360", images: ["https://placehold.co/400x300?text=LabelJet+360"], video: "", spec: "350 bpm, servo drive" },
    ],
  },
  "coating": {
    title: "Coating Systems",
    description: "Film coating, sugar coating, and fully perforated pan systems.",
    products: [
      { name: "CoataPan 600", images: ["https://placehold.co/400x300?text=CoataPan+600"], video: "", spec: "600 kg batch" },
    ],
  },
  "granulation": {
    title: "Granulation & Mixing",
    description: "High‑shear granulators, fluid‑bed dryers, and rapid mixer granulators.",
    products: [
      { name: "RMG-150 Mixer", images: ["https://placehold.co/400x300?text=RMG-150"], video: "", spec: "150 L bowl" },
    ],
  },
  "inspection": {
    title: "Inspection & Checkweighing",
    description: "Vision inspection, metal detectors, and high‑precision checkweighers.",
    products: [
      { name: "VisioCheck 360", images: ["https://placehold.co/400x300?text=VisioCheck+360"], video: "", spec: "Multi‑camera" },
    ],
  },
  "aseptic-filling": {
    title: "Aseptic Filling Lines",
    description: "Barrier‑isolator and RABS filling systems for injectables and biologics.",
    products: [
      { name: "AseptiFill 1000", images: ["https://placehold.co/400x300?text=AseptiFill+1000"], video: "", spec: "Vial + syringe" },
    ],
  },
  "cleanroom": {
    title: "Cleanroom Equipment",
    description: "Laminar flow units, pass‑boxes, and environmental monitoring solutions.",
    products: [
      { name: "LaminarFlow 2400", images: ["https://placehold.co/400x300?text=LaminarFlow+2400"], video: "", spec: "ISO 5 (Class 100)" },
    ],
  },
};

/* ─── Helper: WhatsApp link generator ───────────────────── */
const getWhatsAppLink = (productName) => {
  const phone = "12135550182";
  const message = encodeURIComponent(`Hi PharmaMachine, I'm interested in the ${productName}. Please send more details.`);
  return `https://wa.me/${phone}?text=${message}`;
};

/* ─── Page Component ──────────────────────────────────────── */
export default function ProductCategoryPage() {
  const { category } = useParams();
  const data = PRODUCT_DATA[category];

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-[#0d1017]">
        <p>
          Category not found.{" "}
          <Link to="/" className="text-orange-500 hover:underline">
            Go home
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1017] text-slate-300 font-barlow">
      {/* Hero */}
      <section className="bg-gradient-to-r from-orange-600 to-amber-700 px-5 sm:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/"
            className="text-white/80 hover:text-white text-sm mb-4 inline-block transition"
          >
            &larr; Back to Home
          </Link>
          <h1 className="font-barlowC font-bold text-4xl sm:text-5xl tracking-tight text-white">
            {data.title}
          </h1>
          <p className="mt-3 text-lg text-white/80 max-w-2xl">
            {data.description}
          </p>
        </div>
      </section>

      {/* Product Grid */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.products.map((product) => (
            <div
              key={product.name}
              className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-orange-500/50 transition-all group"
            >
              {/* Image Gallery (first image as cover + small thumbnails) */}
              <div className="relative">
                <img
                  src={product.images?.[0] || "https://placehold.co/400x300?text=No+Image"}
                  alt={product.name}
                  className="w-full h-48 object-cover bg-slate-800 group-hover:opacity-90 transition"
                />
                {product.images?.length > 1 && (
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    {product.images.slice(1, 3).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${product.name} view ${idx + 2}`}
                        className="w-10 h-10 object-cover rounded border border-slate-600 opacity-80 hover:opacity-100 transition"
                      />
                    ))}
                  </div>
                )}

                {/* Video play button overlay (if video exists) */}
                {product.video && (
                  <a
                    href={product.video}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 left-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-orange-600 transition"
                    title="Watch demo video"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </a>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h2 className="font-barlowC font-bold text-xl text-white">
                  {product.name}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {product.spec}
                </p>

                {/* WhatsApp CTA */}
                <a
                  href={getWhatsAppLink(product.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-barlowC font-bold text-xs tracking-widest uppercase py-2 rounded transition"
                >
                  {/* WhatsApp icon */}
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.862L.057 23.486a.5.5 0 00.613.601l5.76-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.574 9.574 0 01-4.895-1.345l-.351-.208-3.62.948.972-3.51-.228-.362A9.555 9.555 0 012.4 12C2.4 6.698 6.698 2.4 12 2.4S21.6 6.698 21.6 12 17.302 21.6 12 21.6z"/>
                  </svg>
                  Request Info via WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}