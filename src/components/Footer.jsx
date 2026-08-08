// PharmaMachineFooter.jsx
// Requirements: react-router-dom, tailwindcss
// Usage: import PharmaMachineFooter from './PharmaMachineFooter'
// Add to tailwind.config.js => fontFamily: { barlow: ['"Barlow"','sans-serif'], barlowC: ['"Barlow Condensed"','sans-serif'] }

import { Link } from "react-router-dom";

/* ─── SVG Icons ─────────────────────────────────────────── */
const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M6.62 10.79a15.45 15.45 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.59.57A1 1 0 0121 16.5v3.51A1 1 0 0120 21 17 17 0 013 4a1 1 0 011-.99H7.5A1 1 0 018.5 4a11.47 11.47 0 00.57 3.58 1 1 0 01-.25 1.01L6.62 10.79z" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z" />
  </svg>
);
const IconLinkedIn = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 110-4.124 2.062 2.062 0 010 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const IconTwitter = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const IconYouTube = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088C19.535 3.6 12 3.6 12 3.6s-7.535 0-9.407.517A3.007 3.007 0 00.505 6.205 31.247 31.247 0 000 12a31.247 31.247 0 00.505 5.795 3.007 3.007 0 002.088 2.088C4.465 20.4 12 20.4 12 20.4s7.535 0 9.407-.517a3.007 3.007 0 002.088-2.088A31.247 31.247 0 0024 12a31.247 31.247 0 00-.505-5.795zM9.609 15.601V8.408l6.264 3.602-6.264 3.591z" />
  </svg>
);
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);
const IconWhatsApp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.862L.057 23.486a.5.5 0 00.613.601l5.76-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.574 9.574 0 01-4.895-1.345l-.351-.208-3.62.948.972-3.51-.228-.362A9.555 9.555 0 012.4 12C2.4 6.698 6.698 2.4 12 2.4S21.6 6.698 21.6 12 17.302 21.6 12 21.6z" />
  </svg>
);
const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
);

/* ─── Data ───────────────────────────────────────────────── */
const NAV_PRODUCTS = [
  { label: "Tablet Press Machines", to: "/products/tablet-press" },
  { label: "Capsule Filling Machines", to: "/products/capsule-filling" },
  { label: "Blister Packaging Machines", to: "/products/blister-packaging" },
  { label: "Liquid Filling & Capping", to: "/products/liquid-filling" },
  { label: "Powder Filling Machines", to: "/products/powder-filling" },
  { label: "Cartoning Machines", to: "/products/cartoning" },
  { label: "Labeling Machines", to: "/products/labeling" },
  { label: "Coating Systems", to: "/products/coating" },
  { label: "Granulation & Mixing", to: "/products/granulation" },
  { label: "Inspection & Checkweighing", to: "/products/inspection" },
  { label: "Aseptic Filling Lines", to: "/products/aseptic-filling" },
  { label: "Cleanroom Equipment", to: "/products/cleanroom" },
];

const NAV_SERVICES = [
  { label: "Turnkey Projects", to: "/services/turnkey" },
  { label: "Custom Machine Design", to: "/services/custom-design" },
  { label: "Validation & Compliance", to: "/services/validation" },
  { label: "Installation & Commissioning", to: "/services/installation" },
  { label: "Technical Support", to: "/services/support" },
  { label: "After-Sales Service", to: "/services/aftersales" },
];

const NAV_COMPANY = [
  { label: "About PharmaMachine", to: "/about" },
  { label: "Careers", to: "/career" },
  { label: "Press & Media", to: "/press" },
  { label: "Partner Program", to: "/partners" },
  { label: "Case Studies", to: "/case-studies" },
  { label: "Blog & Insights", to: "/blog" },
];

const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://linkedin.com/company/pharmamachine", Icon: IconLinkedIn, color: "hover:bg-blue-700" },
  { label: "X (Twitter)", href: "https://twitter.com/pharmamachine", Icon: IconTwitter, color: "hover:bg-slate-600" },
  { label: "YouTube", href: "https://youtube.com/@pharmamachine", Icon: IconYouTube, color: "hover:bg-red-700" },
  { label: "Instagram", href: "https://instagram.com/pharmamachine", Icon: IconInstagram, color: "hover:bg-pink-700" },
  { label: "WhatsApp", href: "https://wa.me/12135550182", Icon: IconWhatsApp, color: "hover:bg-green-700" },
];

const CERTIFICATIONS = ["ISO 9001:2015", "cGMP Compliant", "CE Marked", "FDA Approved", "GAMP 5"];

const HOURS = [
  { day: "Mon – Fri", time: "08:00 – 18:00 EST", open: true },
  { day: "Saturday", time: "09:00 – 13:00 EST", open: true },
  { day: "Sunday", time: "Emergency Support", open: false },
];

/* ─── Sub-components ──────────────────────────────────────── */

/** Accessible column heading with orange rule */
const ColHeading = ({ children }) => (
  <h2 className="font-barlowC font-bold text-[11px] tracking-[0.2em] uppercase text-orange-500 mb-5 flex items-center gap-2">
    <span className="inline-block w-5 h-[2px] bg-orange-500 shrink-0" aria-hidden="true" />
    {children}
  </h2>
);

/** Nav link with animated arrow */
const FooterLink = ({ to, children, external }) => {
  const cls =
    "group flex items-center gap-2 text-[13.5px] text-slate-500 hover:text-slate-200 transition-colors duration-200 leading-snug py-0.5";

  return external ? (
    <a href={to} target="_blank" rel="noopener noreferrer" className={cls}>
      <span className="text-orange-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform duration-150">
        <IconArrow />
      </span>
      {children}
    </a>
  ) : (
    <Link to={to} className={cls}>
      <span className="text-orange-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform duration-150">
        <IconArrow />
      </span>
      {children}
    </Link>
  );
};

/** Contact row with icon box */
const ContactRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3">
    <div
      className="w-8 h-8 shrink-0 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-orange-500"
      aria-hidden="true"
    >
      <Icon />
    </div>
    <div>
      <p className="font-barlowC font-bold text-[10px] tracking-[0.14em] uppercase text-slate-600 mb-0.5">{label}</p>
      <div className="text-[13.5px] text-slate-400 leading-snug">{children}</div>
    </div>
  </div>
);

/* ─── Main Footer ─────────────────────────────────────────── */
export default function PharmaMachineFooter() {
  return (
    <footer
      itemScope
      itemType="https://schema.org/Organization"
      className="bg-[#0d1017] text-slate-400 font-barlow w-full"
      aria-label="Site footer"
    >
      {/* ── SEO: hidden org metadata ── */}
      <meta itemProp="name" content="PharmaMachine Pharmaceutical Machinery" />
      <meta itemProp="url" content="https://pharmamachine.com" />

      {/* ── Top announcement bar ── */}
      <div className="bg-orange-600 px-5 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="font-barlowC font-semibold text-[12px] tracking-widest uppercase text-white">
          ⚙ Pharmaceutical machinery solutions since 1987 — trusted by 3,000+ manufacturers worldwide
        </p>
        <div className="flex flex-wrap gap-4">
          {[
            { label: "Request a Quote", to: "/quote" },
            { label: "Turnkey Projects", to: "/turnkey" },
            { label: "Client Portal", to: "/login" },
          ].map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="font-barlowC font-bold text-[11px] tracking-wider uppercase text-white/80 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-slate-800">

        {/* Col 1 – Brand */}
        <div className="p-8 sm:border-r border-slate-800 lg:col-span-1">
          {/* Logo */}
          <Link to="/" aria-label="PharmaMachine — Home">
            <div className="flex items-end gap-2 mb-1">
              <span className="font-barlowC font-bold text-[32px] leading-none text-white tracking-tight">
                PHARMA<span className="text-orange-500">MACHINE</span>
              </span>
            </div>
          </Link>
          <p className="font-barlowC text-[11px] tracking-[0.18em] uppercase text-slate-600 mb-4">
            Pharmaceutical Machinery
          </p>

          <p
            itemProp="description"
            className="text-[13.5px] leading-relaxed text-slate-500 mb-5 max-w-xs"
          >
            Engineering high‑precision pharmaceutical processing and packaging equipment for
            solid dose, liquid, and sterile applications — built to cGMP, delivered on time.
          </p>

          {/* Certifications */}
          <div className="flex flex-wrap gap-2 mb-6" aria-label="Certifications">
            {CERTIFICATIONS.map((c) => (
              <span
                key={c}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] font-barlowC font-bold tracking-wide uppercase text-slate-400"
              >
                {c}
              </span>
            ))}
          </div>

          {/* Social Links */}
          <nav aria-label="Social media links">
            <p className="font-barlowC font-bold text-[10px] tracking-[0.18em] uppercase text-slate-600 mb-3">
              Follow Us
            </p>
            <div className="flex gap-2 flex-wrap">
              {SOCIAL_LINKS.map(({ label, href, Icon, color }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow PharmaMachine on ${label}`}
                  title={label}
                  className={`w-9 h-9 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 hover:text-white hover:border-transparent transition-all duration-200 ${color}`}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </nav>
        </div>

        {/* Col 2 – Products & Services */}
        <div className="p-8 border-t sm:border-t-0 sm:border-r border-slate-800">
          <ColHeading>Products</ColHeading>
          <nav aria-label="Product categories">
            <ul className="space-y-1" role="list">
              {NAV_PRODUCTS.map(({ label, to }) => (
                <li key={to}>
                  <FooterLink to={to}>{label}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-7">
            <ColHeading>Services</ColHeading>
            <nav aria-label="Services">
              <ul className="space-y-1" role="list">
                {NAV_SERVICES.map(({ label, to }) => (
                  <li key={to}>
                    <FooterLink to={to}>{label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Col 3 – Contact */}
        <div className="p-8 border-t lg:border-t-0 border-slate-800 sm:border-r-0 lg:border-r">
          <ColHeading>Contact Us</ColHeading>

          <address
            itemProp="address"
            itemScope
            itemType="https://schema.org/PostalAddress"
            className="not-italic space-y-4"
          >
            <ContactRow icon={IconPin} label="Headquarters">
              <span itemProp="streetAddress">212 Innovation Drive</span>,{" "}
              <span itemProp="addressLocality">Philadelphia</span>,{" "}
              <span itemProp="addressRegion">PA</span>{" "}
              <span itemProp="postalCode">19103</span>,{" "}
              <span itemProp="addressCountry">USA</span>
            </ContactRow>

            <ContactRow icon={IconPhone} label="Sales Hotline">
              <a
                href="tel:+12135550182"
                itemProp="telephone"
                className="hover:text-orange-400 transition-colors"
                aria-label="Call our sales line"
              >
                +1 (213) 555-0182
              </a>
              <br />
              <a
                href="tel:+18005550100"
                className="text-[12px] text-slate-600 hover:text-orange-400 transition-colors"
                aria-label="Call our toll-free number"
              >
                Toll-free: +1 (800) 555-0100
              </a>
            </ContactRow>

            <ContactRow icon={IconMail} label="Email">
              <a
                href="mailto:sales@pharmamachine.com"
                itemProp="email"
                className="hover:text-orange-400 transition-colors"
              >
                sales@pharmamachine.com
              </a>
              <br />
              <a
                href="mailto:support@pharmamachine.com"
                className="text-[12px] text-slate-600 hover:text-orange-400 transition-colors"
              >
                support@pharmamachine.com
              </a>
            </ContactRow>

            <ContactRow icon={IconClock} label="Business Hours">
              <div
                className="mt-1 bg-slate-900 border-l-2 border-orange-600 rounded-r p-3 space-y-1.5"
                itemProp="openingHours"
              >
                {HOURS.map(({ day, time, open }) => (
                  <div key={day} className="flex justify-between text-[12px]">
                    <span className="text-slate-600">{day}</span>
                    <span className={open ? "text-emerald-500" : "text-slate-600"}>{time}</span>
                  </div>
                ))}
              </div>
            </ContactRow>
          </address>
        </div>

        {/* Col 4 – Newsletter + Company */}
        <div className="p-8 border-t lg:border-t-0 border-slate-800">
          <ColHeading>Newsletter</ColHeading>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-3">
            Regulatory updates, machine specs, and pharma tech news — no spam, unsubscribe anytime.
          </p>
          {/* Newsletter form — no <form> tag per guidelines */}
          <div className="flex rounded overflow-hidden border border-slate-700 bg-slate-900 focus-within:border-orange-600 transition-colors">
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              placeholder="your@pharma.com"
              autoComplete="email"
              className="flex-1 bg-transparent px-3 py-2.5 text-[13px] text-slate-300 placeholder-slate-600 outline-none min-w-0"
              aria-label="Enter your email to subscribe"
            />
            <button
              type="button"
              className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 px-4 text-white font-barlowC font-bold text-[11px] tracking-widest uppercase transition-colors shrink-0"
              aria-label="Subscribe to newsletter"
            >
              Subscribe
            </button>
          </div>

          {/* WhatsApp CTA */}
          <a
            href="https://wa.me/12135550182"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded border border-green-700/40 bg-green-900/20 text-green-400 hover:bg-green-900/40 hover:border-green-600 transition-all text-[12.5px] font-barlowC font-bold tracking-wider uppercase"
            aria-label="Chat with us on WhatsApp"
          >
            <IconWhatsApp />
            Chat on WhatsApp
          </a>

          <div className="mt-7">
            <ColHeading>Company</ColHeading>
            <nav aria-label="Company pages">
              <ul className="space-y-1" role="list">
                {NAV_COMPANY.map(({ label, to }) => (
                  <li key={to}>
                    <FooterLink to={to}>{label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* ── Trust bar ── */}
      <div className="border-b border-slate-800 px-5 sm:px-8 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {[
          "3,000+ Satisfied Clients",
          "80+ Countries Served",
          "cGMP Compliant",
          "24/7 Technical Support",
          "On‑Site Validation",
        ].map((item) => (
          <span key={item} className="flex items-center gap-1.5 text-[12px] text-slate-600 font-barlowC font-semibold tracking-wide uppercase">
            <span className="text-orange-600"><IconShield /></span>
            {item}
          </span>
        ))}
      </div>

      {/* ── Bottom bar ── */}
      <div className="px-5 sm:px-8 py-4 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 bg-[#090b0f]">
        <p className="text-[12px] text-slate-700 order-3 sm:order-1">
          &copy; {new Date().getFullYear()} PharmaMachine. All rights reserved.
        </p>

        <nav aria-label="Legal links" className="order-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
          {[
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms of Sale", to: "/terms" },
            { label: "Cookie Settings", to: "/cookies" },
            { label: "Sitemap", to: "/sitemap.xml" },
            { label: "Accessibility", to: "/accessibility" },
          ].map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="text-[12px] text-slate-700 hover:text-slate-400 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Payment methods */}
        <div className="order-1 sm:order-3 flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
          {["VISA", "MC", "AMEX", "Wire", "NET 30", "PayPal"].map((m) => (
            <span
              key={m}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-[10px] font-barlowC font-bold tracking-wide text-slate-500"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}