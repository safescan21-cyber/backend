// Technical documents attached to products (datasheets, manuals, drawings,
// certificates). Files live on this server in uploads/documents under random
// names; a product stores only { name, file, size, type }, never a free URL.
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', '..', 'uploads', 'documents');
const MAX_DOC_BYTES = 25 * 1024 * 1024; // 25 MB per file
const MAX_DOCS_PER_PRODUCT = 20;

// Allowed types: extension → how the file must start (checked on upload, so a
// renamed web page or script can't be stored) and how it is served.
const startsWith = (buf, sig) => buf.length >= sig.length && sig.every((b, i) => buf[i] === b);
const ascii = (buf, s) => buf.slice(0, s.length).toString('latin1') === s;
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // old .doc / .xls / .ppt

const TYPES = {
  pdf: { mime: 'application/pdf', inline: true, label: 'PDF', check: (b) => ascii(b, '%PDF-') },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word', check: (b) => startsWith(b, ZIP) },
  doc: { mime: 'application/msword', label: 'Word', check: (b) => startsWith(b, OLE) },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel', check: (b) => startsWith(b, ZIP) },
  xls: { mime: 'application/vnd.ms-excel', label: 'Excel', check: (b) => startsWith(b, OLE) },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PowerPoint', check: (b) => startsWith(b, ZIP) },
  dwg: { mime: 'application/acad', label: 'AutoCAD', check: (b) => ascii(b, 'AC10') },
  dxf: { mime: 'application/dxf', label: 'DXF', check: (b) => /^\s*0\s*[\r\n]+\s*(SECTION|999)/.test(b.slice(0, 64).toString('latin1')) },
  step: { mime: 'application/step', label: 'STEP 3D', check: (b) => ascii(b, 'ISO-10303-21') },
  stp: { mime: 'application/step', label: 'STEP 3D', check: (b) => ascii(b, 'ISO-10303-21') },
  zip: { mime: 'application/zip', label: 'ZIP', check: (b) => startsWith(b, ZIP) },
  png: { mime: 'image/png', inline: true, label: 'Image', check: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47]) },
  jpg: { mime: 'image/jpeg', inline: true, label: 'Image', check: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  jpeg: { mime: 'image/jpeg', inline: true, label: 'Image', check: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
};
const EXTENSIONS = Object.keys(TYPES);
const FILE_RE = new RegExp(`^[a-f0-9]{32}\\.(${EXTENSIONS.join('|')})$`);

const extOf = (name) => String(name || '').toLowerCase().split('.').pop();

// Readable name shown to visitors: no folders, no control or markup characters
const cleanName = (name) =>
  String(name || '')
    .split(/[\\/]/).pop()
    .replace(/[\u0000-\u001f\u007f<>"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'Document';

// Keep only valid document entries on a product (admin input is not trusted blindly)
const cleanDocuments = (list) => {
  if (!Array.isArray(list)) return undefined; // field not sent: leave as is
  const seen = new Set();
  const out = [];
  for (const d of list) {
    if (!d || typeof d !== 'object' || typeof d.file !== 'string' || !FILE_RE.test(d.file) || seen.has(d.file)) continue;
    seen.add(d.file);
    out.push({
      name: cleanName(d.name),
      file: d.file,
      size: Math.max(0, Math.min(MAX_DOC_BYTES, Number(d.size) || 0)),
      type: extOf(d.file),
    });
    if (out.length >= MAX_DOCS_PER_PRODUCT) break;
  }
  return out;
};

module.exports = { DOCS_DIR, MAX_DOC_BYTES, MAX_DOCS_PER_PRODUCT, TYPES, EXTENSIONS, FILE_RE, extOf, cleanName, cleanDocuments };
