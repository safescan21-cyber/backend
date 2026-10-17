// Builds a one-page PDF invoice for an order and returns it as a Buffer.
// Company name, address and logo come from src/utils/company.js (overridable in .env).
const fs = require("fs");
const PDFDocument = require("pdfkit");
const company = require("../utils/company");

const BRAND = "#0891B2"; // teal from the logo
const hasLogo = fs.existsSync(company.logoPath);

// The built-in PDF fonts have no ₹ glyph, so amounts use "Rs."
const money = (n) =>
  `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d) =>
  new Date(d || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const PAYMENT_LABELS = { cod: "Cash on Delivery", card: "Card", upi: "UPI", wallet: "Wallet" };

const generateInvoicePdf = (order) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const seller = company;
    const { customerInfo = {}, shippingAddress = {}, items = [] } = order;
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // ── Header: logo, company name and address on the left, invoice details on the right ──
    doc.rect(0, 0, doc.page.width, 6).fill(BRAND);
    const logoSize = 58;
    const textLeft = hasLogo ? left + logoSize + 12 : left;
    if (hasLogo) doc.image(company.logoPath, left, 44, { width: logoSize, height: logoSize });
    const headWidth = width * 0.58 - (textLeft - left);
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#0F172A").text(seller.name, textLeft, 46, { width: headWidth });
    doc.fontSize(9).font("Helvetica").fillColor("#555");
    [seller.address, seller.phone && `Phone: ${seller.phone}`, seller.email, seller.gstin && `GSTIN: ${seller.gstin}`]
      .filter(Boolean)
      .forEach((line) => doc.text(line, textLeft, undefined, { width: headWidth }));
    const headerBottom = Math.max(doc.y, 44 + logoSize);

    doc.fontSize(22).font("Helvetica-Bold").fillColor(BRAND).text("INVOICE", left, 46, { width, align: "right" });
    doc.fontSize(9).font("Helvetica").fillColor("#333")
      .text(`Invoice no: ${order.orderId}`, left, 76, { width, align: "right" })
      .text(`Date: ${formatDate(order.orderDate || order.createdAt)}`, { width, align: "right" })
      .text(`Payment: ${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod} (${order.paymentStatus})`, { width, align: "right" });

    // ── Bill to ──
    let y = Math.max(doc.y, headerBottom, 130) + 16;
    doc.moveTo(left, y).lineTo(right, y).strokeColor("#ddd").stroke();
    y += 12;
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1a1a1a").text("Bill to / Ship to", left, y);
    doc.fontSize(9).font("Helvetica").fillColor("#333");
    [
      `${customerInfo.firstName || ""} ${customerInfo.lastName || ""}`.trim(),
      shippingAddress.addressLine1,
      shippingAddress.addressLine2,
      [shippingAddress.city, shippingAddress.state].filter(Boolean).join(", ") +
        (shippingAddress.pincode ? ` - ${shippingAddress.pincode}` : ""),
      shippingAddress.country,
      customerInfo.phone && `Phone: ${customerInfo.phone}`,
      customerInfo.email,
    ]
      .filter(Boolean)
      .forEach((line) => doc.text(line));

    // ── Items table ──
    y = doc.y + 18;
    const col = { item: left, qty: left + width * 0.54, price: left + width * 0.62, total: left + width * 0.79 };
    doc.rect(left, y, width, 20).fill("#f2f2f2");
    doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(9)
      .text("Item", col.item + 6, y + 6)
      .text("Qty", col.qty, y + 6, { width: col.price - col.qty - 6, align: "right" })
      .text("Price", col.price, y + 6, { width: col.total - col.price - 6, align: "right" })
      .text("Amount", col.total, y + 6, { width: right - col.total - 6, align: "right" });
    y += 26;

    doc.font("Helvetica").fontSize(9).fillColor("#333");
    items.forEach((item) => {
      const nameHeight = doc.heightOfString(item.name || "", { width: col.qty - col.item - 12 });
      if (y + nameHeight > doc.page.height - 160) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc.text(item.name || "", col.item + 6, y, { width: col.qty - col.item - 12 })
        .text(`${item.quantity}${item.unit ? ` ${item.unit}` : ""}`, col.qty, y, { width: col.price - col.qty - 6, align: "right" })
        .text(money(item.price), col.price, y, { width: col.total - col.price - 6, align: "right" })
        .text(money(item.price * item.quantity), col.total, y, { width: right - col.total - 6, align: "right" });
      y += Math.max(nameHeight, 12) + 8;
      doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor("#eee").stroke();
    });

    // ── Totals ──
    y += 6;
    const totalRow = (label, value, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9).fillColor("#1a1a1a")
        .text(label, col.price - 40, y, { width: col.total - col.price + 34, align: "right" })
        .text(value, col.total, y, { width: right - col.total - 6, align: "right" });
      y += bold ? 18 : 14;
    };
    totalRow("Subtotal", money(order.subtotal));
    totalRow("Shipping", money(order.shippingCost));
    if (order.discount) totalRow(order.couponCode ? `Discount (${order.couponCode})` : "Discount", `- ${money(order.discount)}`);
    totalRow("Total", money(order.totalAmount), true);

    // ── Footer ──
    const footY = doc.page.height - 112; // last line must stay inside the bottom margin or PDFKit adds a page
    doc.moveTo(left, footY).lineTo(right, footY).strokeColor("#ddd").stroke();
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#0F172A")
      .text(seller.name, left, footY + 10, { width, align: "center", lineBreak: false });
    doc.fontSize(8).font("Helvetica").fillColor("#666")
      .text([seller.address, seller.website.replace(/^https?:\/\//, "")].filter(Boolean).join("  |  "), left, footY + 24, { width, align: "center", lineBreak: false })
      .fillColor("#888")
      .text("Thank you for your business. This is a computer-generated invoice.", left, footY + 38, { width, align: "center", lineBreak: false });

    doc.end();
  });

module.exports = { generateInvoicePdf };
