// Company details printed on invoices and order emails.
// Each value can be overridden in .env (SELLER_NAME, SELLER_ADDRESS, SELLER_PHONE,
// SELLER_EMAIL, SELLER_GSTIN) without changing code.
const path = require("path");

const SITE = "https://www.foodpharmamachinery.com";

const company = {
  name: process.env.SELLER_NAME || "PureLine Machinery Pvt. Ltd.",
  address: process.env.SELLER_ADDRESS || "Q-37, Shivalik Nagar, Haridwar, Uttarakhand, India",
  phone: process.env.SELLER_PHONE || process.env.SUPPORT_PHONE || "+91 87007 92607",
  email: process.env.SELLER_EMAIL || process.env.SMTP_USER || "",
  gstin: process.env.SELLER_GSTIN || "",
  website: SITE,
  // Logo file for PDFs, and a public copy of the same logo for emails
  logoPath: path.join(__dirname, "../../assets/company-logo.png"),
  logoUrl: `${SITE}/android-chrome-192x192.png`,
};

module.exports = company;
