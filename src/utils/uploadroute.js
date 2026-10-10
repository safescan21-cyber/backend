// src/upload/uploadroute.js
const express = require('express');
const multer = require('multer');
const { verifyToken } = require('../middlewere/authMiddleware');
const uploadToCloudinary = require('./uploadImage');

const router = express.Router();

// ============================================================
//  IMAGE UPLOAD
// ============================================================
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB per photo

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPG, PNG, WEBP, GIF) are allowed.'));
  },
});

// POST /uploadImages — form field name: "images"
router.post('/uploadImages', verifyToken, (req, res) => {
  imageUpload.array('images', MAX_IMAGES)(req, res, async (err) => {
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

// ============================================================
//  VIDEO UPLOAD
// ============================================================
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/^video\/(mp4|webm|ogg|quicktime|x-msvideo|x-matroska)$/i.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only video files (MP4, WEBM, MOV, OGG) are allowed.'));
  },
});

// POST /upload/video — form field name: "video"
router.post('/upload/video', verifyToken, (req, res) => {
  videoUpload.single('video')(req, res, async (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Video must be 100 MB or smaller.'
          : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Unexpected field. Use "video" as the form field name.'
          : err.message || 'Upload failed.';
      return res.status(400).json({ message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No video received.' });
      }

      // isVideo = true → util must set resource_type: 'video'
      const result = await uploadToCloudinary(
        req.file.buffer,
        { folder: 'foodpharma/videos' },
        true
      );

      return res.status(200).json({
        url: result.secure_url,
        public_id: result.public_id,
      });
    } catch (error) {
      console.error('Video upload error:', error.message || error);
      return res.status(500).json({ message: 'Could not upload the video. Please try again.' });
    }
  });
});

module.exports = router;