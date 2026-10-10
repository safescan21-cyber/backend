// src/upload/uploadroute.js
const express = require('express');
const multer = require('multer');
const { verifyToken } = require('../middlewere/authMiddleware');
const uploadToCloudinary = require('../utils/uploadImage');

const router = express.Router();

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB per photo

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (JPG, PNG, WEBP, GIF) are allowed.'));
  },
});

// POST /uploadImages  (also reachable as /api/uploadImages)
// Form field name: "images". Returns { urls: [...] }
router.post('/uploadImages', verifyToken, (req, res) => {
  upload.array('images', MAX_IMAGES)(req, res, async (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Each photo must be 10 MB or smaller.'
          : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? `You can upload up to ${MAX_IMAGES} photos at once.`
          : err.message || 'Upload failed.';
      return res.status(400).json({ message });
    }

    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No images received.' });
      }

      const results = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer, {}, false))
      );

      return res.status(200).json({ urls: results.map((r) => r.secure_url) });
    } catch (error) {
      console.error('Image upload error:', error.message || error);
      return res.status(500).json({ message: 'Could not upload the images. Please try again.' });
    }
  });
});

module.exports = router;