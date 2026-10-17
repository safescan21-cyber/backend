// POST /api/upload/document  — admin uploads one technical document (form field "document")
// GET  /api/documents/:file  — anyone opens (PDF/images in the browser) or downloads it
//                              ?download=1 forces a download; ?name= sets the saved file name
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { verifyToken, verifyAdmin } = require('../middlewere/authMiddleware');
const { DOCS_DIR, MAX_DOC_BYTES, TYPES, EXTENSIONS, FILE_RE, extOf, cleanName } = require('./documentFiles');

const router = express.Router();
fs.mkdirSync(DOCS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  defParamCharset: 'utf8', // keep Hindi and other non-English file names readable
  limits: { fileSize: MAX_DOC_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (TYPES[extOf(file.originalname)]) return cb(null, true);
    cb(new Error(`This file type isn't allowed. Use: ${EXTENSIONS.filter((e) => e !== 'jpeg' && e !== 'stp').map((e) => e.toUpperCase()).join(', ')}.`));
  },
});

router.post('/upload/document', verifyToken, verifyAdmin, (req, res) => {
  upload.single('document')(req, res, async (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Each document must be 25 MB or smaller.'
          : err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Send one file in the "document" field.'
          : err.message || 'Upload failed.';
      return res.status(400).json({ message });
    }
    if (!req.file) return res.status(400).json({ message: 'No document received.' });

    const ext = extOf(req.file.originalname);
    if (!TYPES[ext].check(req.file.buffer)) {
      return res.status(400).json({ message: `"${cleanName(req.file.originalname)}" is not a real ${TYPES[ext].label} file.` });
    }
    try {
      const file = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
      await fs.promises.writeFile(path.join(DOCS_DIR, file), req.file.buffer, { flag: 'wx' });
      console.log(`Documents: admin ${req.userId || ''} uploaded ${file} (${req.file.size} bytes)`);
      return res.status(201).json({ name: cleanName(req.file.originalname), file, size: req.file.size, type: ext });
    } catch (error) {
      console.error('Document upload error:', error.message || error);
      return res.status(500).json({ message: 'Could not save the document. Please try again.' });
    }
  });
});

router.get('/documents/:file', (req, res) => {
  const { file } = req.params;
  if (!FILE_RE.test(file)) return res.status(404).json({ message: 'Document not found' });
  const ext = extOf(file);
  const type = TYPES[ext];
  const wantsDownload = req.query.download === '1' || !type.inline;

  // Saved file name: the product's document name, keeping the real extension
  let name = cleanName(typeof req.query.name === 'string' ? req.query.name : `document.${ext}`);
  if (extOf(name) !== ext) name = `${name}.${ext}`;
  const asciiName = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\;]/g, '_');

  res.set({
    'Content-Type': type.mime,
    'Content-Disposition': `${wantsDownload ? 'attachment' : 'inline'}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=31536000, immutable', // random names never change
  });
  res.sendFile(file, { root: DOCS_DIR, dotfiles: 'deny', headers: { 'Content-Type': type.mime } }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ message: 'Document not found' });
  });
});

module.exports = router;
