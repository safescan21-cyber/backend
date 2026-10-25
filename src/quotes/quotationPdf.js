// Builds the formal quotation PDF for a quote request (Quotation builder in admin, and the
// instant quotation from the chat / machine pages) and returns it as a Buffer.
// Standard business quotation layout: letterhead, quotation details, customer, subject,
// numbered items (with the machine's description and key specifications), totals with the
// amount in words, terms, customer support, signatory. Same letterhead as the order invoice.
const fs = require("fs");
const PDFDocument = require("pdfkit");
const company = require("../utils/company");

const BRAND = "#0891B2";
const INK = "#0F172A";
const hasLogo = fs.existsSync(company.logoPath);
const SUPPORT = company.phone; // customer support = the WhatsApp number

// The built-in PDF fonts have no ₹ glyph, so amounts use "Rs."
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (d) => new Date(d || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// Subtotal, GST and total from the quotation lines
const totals = (q) => {
  const subtotal = (q.items || []).reduce((s, i) => s + Number(i.unitPrice || 0) * Number(i.quantity || 0), 0) + Number(q.freight || 0);
  const gst = Math.round(subtotal * Number(q.gstPercent || 0)) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, gst, total: Math.round((subtotal + gst) * 100) / 100 };
};

// 1003000.5 -> "Rupees Ten Lakh Three Thousand and Fifty Paise Only" (Indian numbering)
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const below100 = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);
const below1000 = (n) => [n >= 100 && `${ONES[Math.floor(n / 100)]} Hundred`, n % 100 && below100(n % 100)].filter(Boolean).join(" ");
const indianWords = (n) => {
  if (!n) return "Zero";
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(`${indianWords(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (n) parts.push(below1000(n));
  return parts.join(" ");
};
const amountInWords = (amount) => {
  const rupees = Math.floor(Number(amount || 0));
  const paise = Math.round((Number(amount || 0) - rupees) * 100);
  return `Rupees ${indianWords(rupees)}${paise ? ` and ${below100(paise)} Paise` : ""} Only`;
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
    const bottomLimit = doc.page.height - 130;
    const site = company.website.replace(/^https?:\/\//, "");
    let y;
    const newPageIfNeeded = (needed) => { if (y + needed > bottomLimit) { doc.addPage(); y = doc.page.margins.top; } };

    // ── Letterhead ──
    doc.rect(0, 0, doc.page.width, 6).fill(BRAND);
    const logoSize = 58;
    const textLeft = hasLogo ? left + logoSize + 12 : left;
    if (hasLogo) doc.image(company.logoPath, left, 44, { width: logoSize, height: logoSize });
    const headWidth = width * 0.58 - (textLeft - left);
    doc.fontSize(16).font("Helvetica-Bold").fillColor(INK).text(company.name, textLeft, 46, { width: headWidth });
    doc.fontSize(9).font("Helvetica").fillColor("#555");
    [company.address, company.phone && `Phone / WhatsApp: ${company.phone}`, company.email && `Email: ${company.email}`, `Website: ${site}`, company.gstin && `GSTIN: ${company.gstin}`]
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
      .text(`Your enquiry: ${quote.quoteNumber || "-"}`, { width, align: "right" });

    // ── Customer ──
    y = Math.max(doc.y, headerBottom, 130) + 16;
    doc.moveTo(left, y).lineTo(right, y).strokeColor("#ddd").stroke();
    y += 12;
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1a1a1a").text("Quotation for", left, y);
    doc.fontSize(9).font("Helvetica").fillColor("#333");
    [c.name, c.company, c.gstin && `GSTIN: ${c.gstin}`, [quote.deliveryCity, quote.deliveryState, quote.country].filter(Boolean).join(", "), c.phone && `Phone: ${c.phone}`, c.email && `Email: ${c.email}`]
      .filter(Boolean)
      .forEach((line) => doc.text(line));

    // ── Subject and greeting ──
    const items = q.items || [];
    const subject = items.length === 1 ? items[0].name : `${items[0]?.name || "Machinery"}${items.length > 1 ? ` and ${items.length - 1} more item(s)` : ""}`;
    y = doc.y + 12;
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#1a1a1a").text(`Subject: Quotation for ${subject}`, left, y, { width });
    doc.moveDown(0.4).font("Helvetica").fillColor("#333").text("Dear Sir / Madam,", left, undefined, { width })
      .moveDown(0.2).text("Thank you for your enquiry. We are pleased to submit our quotation as below.", left, undefined, { width });

    // ── Items ──
    y = doc.y + 14;
    const col = { no: left, item: left + 26, qty: left + width * 0.56, price: left + width * 0.64, total: left + width * 0.81 };
    const descWidth = col.qty - col.item - 12;
    const tableHead = () => {
      doc.rect(left, y, width, 20).fill(BRAND);
      doc.fillColor("#fff").font("Helvetica-Bold").fontSize(9)
        .text("S.No", col.no + 4, y + 6, { width: 22 })
        .text("Description", col.item + 4, y + 6)
        .text("Qty", col.qty, y + 6, { width: col.price - col.qty - 6, align: "right" })
        .text("Unit price", col.price, y + 6, { width: col.total - col.price - 6, align: "right" })
        .text("Amount", col.total, y + 6, { width: right - col.total - 6, align: "right" });
      y += 26;
    };
    tableHead();
    items.forEach((item, i) => {
      const specs = (item.specs || []).filter((s) => s?.key && s?.value).map((s) => `• ${s.key}: ${s.value}`);
      // Height of this row: name, model line, description, specifications
      doc.font("Helvetica-Bold").fontSize(9.5);
      let h = doc.heightOfString(item.name || "", { width: descWidth });
      doc.font("Helvetica").fontSize(8.5);
      if (item.notes) h += doc.heightOfString(item.notes, { width: descWidth }) + 2;
      if (item.description) h += doc.heightOfString(item.description, { width: descWidth }) + 4;
      if (specs.length) h += doc.heightOfString(specs.join("\n"), { width: descWidth }) + 4;
      if (y + h > bottomLimit) { doc.addPage(); y = doc.page.margins.top; tableHead(); }

      const top = y;
      doc.font("Helvetica").fontSize(9).fillColor("#333")
        .text(String(i + 1), col.no + 4, top, { width: 22 })
        .text(String(item.quantity), col.qty, top, { width: col.price - col.qty - 6, align: "right" })
        .text(money(item.unitPrice), col.price, top, { width: col.total - col.price - 6, align: "right" })
        .text(money(Number(item.unitPrice) * Number(item.quantity)), col.total, top, { width: right - col.total - 6, align: "right" });
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#1a1a1a").text(item.name || "", col.item + 4, top, { width: descWidth });
      doc.font("Helvetica").fontSize(8.5).fillColor("#444");
      if (item.notes) doc.moveDown(0.1).text(item.notes, col.item + 4, undefined, { width: descWidth });
      if (item.description) doc.moveDown(0.3).fillColor("#555").text(item.description, col.item + 4, undefined, { width: descWidth });
      if (specs.length) doc.moveDown(0.3).fillColor("#444").text(specs.join("\n"), col.item + 4, undefined, { width: descWidth });
      y = Math.max(doc.y, top + 12) + 8;
      doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor("#e5e7eb").stroke();
    });

    // ── Totals and amount in words ──
    const t = totals(q);
    newPageIfNeeded(110);
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
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#1a1a1a").text("Amount in words: ", left, y + 2, { continued: true })
      .font("Helvetica").fillColor("#333").text(amountInWords(t.total), { width });
    y = doc.y + 12;

    // ── Terms ──
    const terms = [
      q.deliveryTime && ["Delivery", q.deliveryTime],
      q.paymentTerms && ["Payment", q.paymentTerms],
      q.warranty && ["Warranty", q.warranty],
      ["Validity", `${Number(q.validityDays || 15)} days from the date above`],
    ].filter(Boolean);
    newPageIfNeeded(60 + terms.length * 14);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1a1a1a").text("Terms", left, y);
    y = doc.y + 4;
    terms.forEach(([k, v]) => {
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#333").text(`${k}: `, left, y, { continued: true }).font("Helvetica").text(v, { width });
      y = doc.y + 3;
    });
    if (q.notes) {
      doc.moveDown(0.4).fontSize(9).font("Helvetica").fillColor("#333").text(q.notes, left, undefined, { width });
      y = doc.y;
    }

    // ── Customer support and signatory ──
    y += 14;
    newPageIfNeeded(80);
    const boxW = width * 0.56;
    doc.roundedRect(left, y, boxW, 58, 6).fillAndStroke("#ECFEFF", "#A5F3FC");
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(9.5).text("Customer support", left + 10, y + 8);
    doc.font("Helvetica").fontSize(9).fillColor("#333")
      .text(`WhatsApp / Call: ${SUPPORT}`, left + 10, y + 22, { width: boxW - 20 })
      .text([company.email, site].filter(Boolean).join("  |  "), left + 10, y + 36, { width: boxW - 20 });
    const signX = left + width * 0.62;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#1a1a1a").text(`For ${company.name}`, signX, y + 4, { width: right - signX, align: "right" });
    doc.moveTo(signX + 30, y + 46).lineTo(right, y + 46).strokeColor("#999").stroke();
    doc.font("Helvetica").fontSize(9).fillColor("#555").text("Authorised Signatory", signX, y + 50, { width: right - signX, align: "right" });

    // ── Footer (every page) ──
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footY = doc.page.height - 100;
      doc.moveTo(left, footY).lineTo(right, footY).strokeColor("#ddd").stroke();
      doc.fontSize(9).font("Helvetica-Bold").fillColor(INK).text(company.name, left, footY + 10, { width, align: "center", lineBreak: false });
      doc.fontSize(8).font("Helvetica").fillColor("#666")
        .text([company.address, `WhatsApp ${SUPPORT}`, site].filter(Boolean).join("  |  "), left, footY + 24, { width, align: "center", lineBreak: false })
        .fillColor("#888")
        .text(`Prices in Indian Rupees. Computer-generated quotation.${range.count > 1 ? `  Page ${i + 1} of ${range.count}` : ""}`, left, footY + 38, { width, align: "center", lineBreak: false });
    }
    doc.end();
  });

module.exports = { generateQuotationPdf, quotationTotals: totals, amountInWords };
