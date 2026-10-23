// Builds the formal quotation PDF for a quote request (Quotation builder in admin)
// and returns it as a Buffer. Same letterhead as the order invoice (orders/invoice.js).
const fs = require("fs");
const PDFDocument = require("pdfkit");
const company = require("../utils/company");

const BRAND = "#0891B2";
const hasLogo = fs.existsSync(company.logoPath);

// The built-in PDF fonts have no ₹ glyph, so amounts use "Rs."
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (d) => new Date(d || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// Subtotal, GST and total from the quotation lines
const totals = (q) => {
  const subtotal = (q.items || []).reduce((s, i) => s + Number(i.unitPrice || 0) * Number(i.quantity || 0), 0) + Number(q.freight || 0);
  const gst = Math.round(subtotal * Number(q.gstPercent || 0)) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, gst, total: Math.round((subtotal + gst) * 100) / 100 };
};

const generateQuotationPdf = (quote) =>
  new Promise((resolve, reject) => {
    const q = quote.quotation || {};
    const c = quote.contact || {};
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true }); // footer goes on every page at the end
    const chunks = [];
    doc.on("data", (x) => chunks.push(x));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    const bottomLimit = doc.page.height - 150;

    // ── Letterhead ──
    doc.rect(0, 0, doc.page.width, 6).fill(BRAND);
    const logoSize = 58;
    const textLeft = hasLogo ? left + logoSize + 12 : left;
    if (hasLogo) doc.image(company.logoPath, left, 44, { width: logoSize, height: logoSize });
    const headWidth = width * 0.58 - (textLeft - left);
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#0F172A").text(company.name, textLeft, 46, { width: headWidth });
    doc.fontSize(9).font("Helvetica").fillColor("#555");
    [company.address, company.phone && `Phone / WhatsApp: ${company.phone}`, company.email, company.gstin && `GSTIN: ${company.gstin}`, company.website.replace(/^https?:\/\//, "")]
      .filter(Boolean)
      .forEach((line) => doc.text(line, textLeft, undefined, { width: headWidth }));
    const headerBottom = Math.max(doc.y, 44 + logoSize);

    const issued = q.sentAt || q.updatedAt || new Date();
    const validTill = new Date(new Date(issued).getTime() + Number(q.validityDays || 15) * 86400000);
    doc.fontSize(22).font("Helvetica-Bold").fillColor(BRAND).text("QUOTATION", left, 46, { width, align: "right" });
    doc.fontSize(9).font("Helvetica").fillColor("#333")
      .text(`Quotation no: ${q.number || "-"}`, left, 76, { width, align: "right" })
      .text(`Date: ${formatDate(issued)}`, { width, align: "right" })
      .text(`Valid till: ${formatDate(validTill)}`, { width, align: "right" })
      .text(`Your enquiry: ${quote.quoteNumber}`, { width, align: "right" });

    // ── Customer ──
    let y = Math.max(doc.y, headerBottom, 130) + 16;
    doc.moveTo(left, y).lineTo(right, y).strokeColor("#ddd").stroke();
    y += 12;
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1a1a1a").text("Quotation for", left, y);
    doc.fontSize(9).font("Helvetica").fillColor("#333");
    [c.name, c.company, c.gstin && `GSTIN: ${c.gstin}`, [quote.deliveryCity, quote.deliveryState, quote.country].filter(Boolean).join(", "), c.phone && `Phone: ${c.phone}`, c.email]
      .filter(Boolean)
      .forEach((line) => doc.text(line));

    // ── Items ──
    y = doc.y + 18;
    const col = { item: left, qty: left + width * 0.52, price: left + width * 0.61, total: left + width * 0.79 };
    const tableHead = () => {
      doc.rect(left, y, width, 20).fill("#f2f2f2");
      doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(9)
        .text("Machine / item", col.item + 6, y + 6)
        .text("Qty", col.qty, y + 6, { width: col.price - col.qty - 6, align: "right" })
        .text("Unit price", col.price, y + 6, { width: col.total - col.price - 6, align: "right" })
        .text("Amount", col.total, y + 6, { width: right - col.total - 6, align: "right" });
      y += 26;
    };
    tableHead();
    doc.font("Helvetica").fontSize(9).fillColor("#333");
    (q.items || []).forEach((item) => {
      const label = item.notes ? `${item.name}\n${item.notes}` : item.name || "";
      const h = doc.heightOfString(label, { width: col.qty - col.item - 12 });
      if (y + h > bottomLimit) { doc.addPage(); y = doc.page.margins.top; tableHead(); doc.font("Helvetica").fontSize(9).fillColor("#333"); }
      doc.text(label, col.item + 6, y, { width: col.qty - col.item - 12 })
        .text(String(item.quantity), col.qty, y, { width: col.price - col.qty - 6, align: "right" })
        .text(money(item.unitPrice), col.price, y, { width: col.total - col.price - 6, align: "right" })
        .text(money(Number(item.unitPrice) * Number(item.quantity)), col.total, y, { width: right - col.total - 6, align: "right" });
      y += Math.max(h, 12) + 8;
      doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor("#eee").stroke();
    });

    // ── Totals ──
    const t = totals(q);
    if (y + 80 > bottomLimit) { doc.addPage(); y = doc.page.margins.top; }
    y += 6;
    const row = (label, value, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9).fillColor("#1a1a1a")
        .text(label, col.price - 60, y, { width: col.total - col.price + 54, align: "right" })
        .text(value, col.total, y, { width: right - col.total - 6, align: "right" });
      y += bold ? 18 : 14;
    };
    if (Number(q.freight) > 0) row("Freight / packing", money(q.freight));
    row("Subtotal", money(t.subtotal));
    row(`GST (${Number(q.gstPercent || 0)}%)`, money(t.gst));
    row("Total", money(t.total), true);

    // ── Terms ──
    const terms = [
      q.deliveryTime && ["Delivery", q.deliveryTime],
      q.paymentTerms && ["Payment", q.paymentTerms],
      q.warranty && ["Warranty", q.warranty],
      ["Validity", `${Number(q.validityDays || 15)} days from the date above`],
    ].filter(Boolean);
    y += 10;
    if (y + 40 + terms.length * 14 > bottomLimit) { doc.addPage(); y = doc.page.margins.top; }
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1a1a1a").text("Terms", left, y);
    y = doc.y + 4;
    terms.forEach(([k, v]) => {
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#333").text(`${k}: `, left, y, { continued: true }).font("Helvetica").text(v, { width });
      y = doc.y + 3;
    });
    if (q.notes) {
      doc.moveDown(0.5).fontSize(9).font("Helvetica").fillColor("#333").text(q.notes, left, undefined, { width });
    }

    // ── Footer (every page) ──
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footY = doc.page.height - 112;
      doc.moveTo(left, footY).lineTo(right, footY).strokeColor("#ddd").stroke();
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#0F172A").text(company.name, left, footY + 10, { width, align: "center", lineBreak: false });
      doc.fontSize(8).font("Helvetica").fillColor("#666")
        .text([company.address, company.website.replace(/^https?:\/\//, "")].filter(Boolean).join("  |  "), left, footY + 24, { width, align: "center", lineBreak: false })
        .fillColor("#888")
        .text("Prices in Indian Rupees. Installation and commissioning as per the terms above. Computer-generated quotation.", left, footY + 38, { width, align: "center", lineBreak: false });
    }
    doc.end();
  });

module.exports = { generateQuotationPdf, quotationTotals: totals };
