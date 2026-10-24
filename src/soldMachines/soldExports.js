// The sold machines list as an Excel workbook (exceljs) or a PDF (pdfkit), both as Buffers.
// Used by the admin downloads and the daily email (soldMachines/dailyReport.js).
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const company = require('../utils/company');

const BRAND = '#0891B2';
const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const stamp = () => new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const place = (c) => [c?.city, c?.state].filter(Boolean).join(', ');
const orderRef = (r) => (r.source === 'manual' ? 'Offline sale' : r.orderNumber || '');

const COLUMNS = [
  ['Serial number', 'serialNumber', 24],
  ['Machine', 'productName', 34],
  ['Model', 'modelNumber', 14],
  ['Customer', 'customerName', 22],
  ['Company', 'company', 22],
  ['Phone', 'phone', 16],
  ['Email', 'email', 28],
  ['City / State', 'place', 22],
  ['Order', 'order', 22],
  ['Sold on', 'soldAt', 14],
  ['Price (Rs.)', 'price', 14],
  ['Status', 'status', 11],
  ['Notes', 'notes', 30],
];

const flat = (r) => ({
  serialNumber: r.serialNumber,
  productName: r.productName,
  modelNumber: r.modelNumber || '',
  customerName: r.customer?.name || '',
  company: r.customer?.company || '',
  phone: r.customer?.phone || '',
  email: r.customer?.email || '',
  place: place(r.customer),
  order: orderRef(r),
  soldAt: new Date(r.soldAt),
  price: Number(r.unitPrice) || 0,
  status: r.status === 'cancelled' ? 'Cancelled' : 'Sold',
  notes: r.notes || '',
});

const buildXlsx = async (rows) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = company.name;
  wb.created = new Date();
  const ws = wb.addWorksheet('Sold machines', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = COLUMNS.map(([header, key, width]) => ({ header, key, width }));
  rows.forEach((r) => ws.addRow(flat(r)));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0891B2' } };
  ws.getColumn('soldAt').numFmt = 'dd-mmm-yyyy';
  ws.getColumn('price').numFmt = '#,##0';
  ws.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } };
  rows.forEach((r, i) => {
    if (r.status === 'cancelled') ws.getRow(i + 2).font = { color: { argb: 'FF9CA3AF' }, strike: true };
  });

  // Totals per machine model
  const sum = wb.addWorksheet('Summary');
  sum.columns = [{ header: 'Machine', key: 'name', width: 40 }, { header: 'Model', key: 'model', width: 16 }, { header: 'Units sold', key: 'units', width: 12 }, { header: 'Value (Rs.)', key: 'value', width: 16 }];
  const groups = new Map();
  rows.filter((r) => r.status !== 'cancelled').forEach((r) => {
    const k = `${r.productName}|${r.modelNumber || ''}`;
    const g = groups.get(k) || { name: r.productName, model: r.modelNumber || '', units: 0, value: 0 };
    g.units += 1;
    g.value += Number(r.unitPrice) || 0;
    groups.set(k, g);
  });
  [...groups.values()].sort((a, b) => b.units - a.units).forEach((g) => sum.addRow(g));
  sum.getRow(1).font = { bold: true };
  sum.getColumn('value').numFmt = '#,##0';
  return Buffer.from(await wb.xlsx.writeBuffer());
};

// Landscape A4 table; the header row repeats on every page
const PDF_COLS = [
  ['Serial number', 118, (r) => r.serialNumber],
  ['Machine', 140, (r) => r.productName],
  ['Model', 60, (r) => r.modelNumber || '—'],
  ['Customer', 124, (r) => [r.customer?.name, r.customer?.company].filter(Boolean).join('\n') || '—'],
  ['Contact', 120, (r) => [r.customer?.phone, r.customer?.email].filter(Boolean).join('\n') || '—'],
  ['City / State', 80, (r) => place(r.customer) || '—'],
  ['Order', 70, (r) => orderRef(r) || '—'],
  ['Sold on', 58, (r) => day(r.soldAt) + (r.status === 'cancelled' ? '\nCANCELLED' : '')],
];

const buildPdf = (rows, { title = 'Sold machines – full history' } = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const bottom = doc.page.height - doc.page.margins.bottom - 20;
    const head = () => {
      let x = left;
      doc.rect(left, doc.y, PDF_COLS.reduce((s, c) => s + c[1], 0), 18).fill(BRAND);
      const y = doc.y + 5;
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
      PDF_COLS.forEach(([label, w]) => { doc.text(label, x + 4, y, { width: w - 8, lineBreak: false }); x += w; });
      doc.y = y + 13;
    };

    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(16).text(company.name, left, 36);
    doc.fillColor('#111').fontSize(12).text(title);
    const active = rows.filter((r) => r.status !== 'cancelled').length;
    doc.fillColor('#555').font('Helvetica').fontSize(9).text(`${active} machine(s) sold${rows.length > active ? `, ${rows.length - active} cancelled` : ''}  ·  made ${stamp()} (India time)`);
    doc.moveDown(0.6);
    if (!rows.length) {
      doc.fillColor('#333').fontSize(11).text('No machines sold yet.');
    } else {
      head();
      rows.forEach((r, i) => {
        doc.font('Helvetica').fontSize(8);
        const cells = PDF_COLS.map(([, w, get]) => String(get(r) ?? ''));
        const h = Math.max(...cells.map((t, k) => doc.heightOfString(t, { width: PDF_COLS[k][1] - 8 }))) + 8;
        if (doc.y + h > bottom) { doc.addPage(); doc.y = doc.page.margins.top; head(); }
        const top = doc.y;
        if (i % 2) doc.rect(left, top, PDF_COLS.reduce((s, c) => s + c[1], 0), h).fill('#F1F5F9');
        let x = left;
        cells.forEach((t, k) => {
          doc.fillColor(r.status === 'cancelled' ? '#9CA3AF' : k === 0 ? '#0F172A' : '#333').font(k === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
          doc.text(t, x + 4, top + 4, { width: PDF_COLS[k][1] - 8 });
          x += PDF_COLS[k][1];
        });
        doc.y = top + h;
      });
    }

    const range = doc.bufferedPageRange();
    for (let p = range.start; p < range.start + range.count; p++) {
      doc.switchToPage(p);
      doc.page.margins.bottom = 0; // writing in the margin must not start a new page
      doc.fillColor('#888').font('Helvetica').fontSize(7.5)
        .text(`${company.name} · ${company.address} · ${company.phone}`, left, doc.page.height - 30, { lineBreak: false })
        .text(`Page ${p - range.start + 1} of ${range.count}`, doc.page.width - 136, doc.page.height - 30, { width: 100, align: 'right', lineBreak: false });
    }
    doc.end();
  });

module.exports = { buildXlsx, buildPdf };
