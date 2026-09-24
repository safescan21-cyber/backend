const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const User = require('../users/Usermodel'); // assume User model exists
const PressRelease = require('./PressRelease');
require('dotenv').config();

// ─── Cloudinary configuration ───────────────────────────────────
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Missing Cloudinary credentials – check .env');
} else {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

// Cloudinary upload helper (same as your provided file)
const uploadToCloudinary = (fileBuffer, options = {}, isVideo = false) => {
  return new Promise((resolve, reject) => {
    const baseOptions = {
      overwrite: true,
      invalidate: true,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
    };
    let uploadOptions = { ...baseOptions, ...options };
    if (isVideo) {
      uploadOptions = {
        ...uploadOptions,
        resource_type: 'video',
        eager: [{ width: 400, height: 300, crop: 'fill', format: 'jpg' }],
        eager_async: true,
        format: 'mp4',
        video_codec: 'h264',
        bit_rate: '2m',
        fps: 30,
        folder: 'videos',
      };
    } else {
      uploadOptions = { ...uploadOptions, folder: 'images' };
    }

    cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject({ message: error.message });
      if (!result || !result.secure_url) return reject({ message: 'Upload failed' });
      resolve({
        secure_url: result.secure_url,
        public_id: result.public_id,
        thumbnail_url: result.eager?.[0]?.secure_url,
      });
    }).end(fileBuffer);
  });
};

// Delete helper (for updates & deletions)
const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

// ─── Authentication middleware (JWT + admin check) ────────────
// Checks both the Authorization header AND the httpOnly cookie,
// matching how the rest of the app authenticates (login sets
// res.cookie('token', ...), not a bearer header).
const authAdmin = async (req, res, next) => {
  try {
    const headerToken = req.header('Authorization')?.replace('Bearer ', '');
    const cookieToken = req.cookies?.token;
    const token = headerToken || cookieToken;

    if (!token) throw new Error();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// ─── Optional auth: attaches req.user if a valid admin token is
// present (header or cookie), but never blocks the request. Lets
// public routes show only active items to guests while admins can
// still see everything via the same endpoint. ───────────────────
const optionalAdmin = async (req, res, next) => {
  try {
    const headerToken = req.header('Authorization')?.replace('Bearer ', '');
    const cookieToken = req.cookies?.token;
    const token = headerToken || cookieToken;

    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.role === 'admin') {
      req.user = user;
    }
    next();
  } catch (err) {
    next(); // invalid/expired token — just treat as a guest, don't block
  }
};

// ─── Multer setup (memory storage) ─────────────────────────────
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx/;
  const ext = allowed.test(file.originalname.split('.').pop().toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only images, videos, and documents are allowed'));
};
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter });

// ─── CONTROLLERS (embedded) ─────────────────────────────────────

// CREATE (admin only)
router.post('/', authAdmin, upload.array('media', 10), async (req, res) => {
  try {
    const { title, content, summary, publishedDate, isActive } = req.body;
    const files = req.files || [];

    const mediaItems = [];
    for (const file of files) {
      const isVideo = file.mimetype.startsWith('video/');
      const result = await uploadToCloudinary(file.buffer, {}, isVideo);
      mediaItems.push({
        url: result.secure_url,
        public_id: result.public_id,
        type: isVideo ? 'video' : 'image',
        caption: file.originalname,
        thumbnail: result.thumbnail_url,
      });
    }

    const newPress = new PressRelease({
      title,
      content,
      summary,
      publishedDate: publishedDate || Date.now(),
      isActive: isActive !== undefined ? isActive : true,
      media: mediaItems,
      author: req.user._id,
    });

    await newPress.save();
    res.status(201).json({ success: true, data: newPress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all (with pagination & filtering)
// Public-safe: guests get active-only results; logged-in admins can
// pass active=false (or omit it) to see everything.
router.get('/', optionalAdmin, async (req, res) => {
  try {
    const { active, limit = 10, page = 1 } = req.query;
    const filter = {};

    if (req.user) {
      if (active !== undefined) filter.isActive = active === 'true';
    } else {
      filter.isActive = true;
    }

    const presses = await PressRelease.find(filter)
      .populate('author', 'name email')
      .sort({ publishedDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await PressRelease.countDocuments(filter);

    res.json({
      success: true,
      data: presses,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single
// Public-safe: guests can view an individual active press release;
// admins can view any, including inactive ones (for editing/preview).
router.get('/:id', optionalAdmin, async (req, res) => {
  try {
    const press = await PressRelease.findById(req.params.id).populate('author', 'name email');
    if (!press) return res.status(404).json({ success: false, message: 'Not found' });

    if (!press.isActive && !req.user) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, data: press });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE (admin only, replace media if new files provided)
router.put('/:id', authAdmin, upload.array('media', 10), async (req, res) => {
  try {
    const { title, content, summary, publishedDate, isActive } = req.body;
    const press = await PressRelease.findById(req.params.id);
    if (!press) return res.status(404).json({ success: false, message: 'Not found' });

    // Update text fields
    if (title) press.title = title;
    if (content) press.content = content;
    if (summary) press.summary = summary;
    if (publishedDate) press.publishedDate = publishedDate;
    if (isActive !== undefined) press.isActive = isActive;

    // Handle media replacement
    const files = req.files;
    if (files && files.length) {
      // Delete old media from Cloudinary
      for (const old of press.media) {
        await deleteFromCloudinary(old.public_id).catch(console.error);
      }
      // Upload new media
      const newMedia = [];
      for (const file of files) {
        const isVideo = file.mimetype.startsWith('video/');
        const result = await uploadToCloudinary(file.buffer, {}, isVideo);
        newMedia.push({
          url: result.secure_url,
          public_id: result.public_id,
          type: isVideo ? 'video' : 'image',
          caption: file.originalname,
          thumbnail: result.thumbnail_url,
        });
      }
      press.media = newMedia;
    }

    await press.save();
    res.json({ success: true, data: press });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE (admin only)
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    const press = await PressRelease.findById(req.params.id);
    if (!press) return res.status(404).json({ success: false, message: 'Not found' });

    // Delete all associated media from Cloudinary
    for (const media of press.media) {
      await deleteFromCloudinary(media.public_id).catch(console.error);
    }

    await press.deleteOne();
    res.json({ success: true, message: 'Press release deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;