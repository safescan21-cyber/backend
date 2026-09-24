const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const HeroSlide = require('./HeroSlide'); // adjust path
const { verifyToken, verifyAdmin } = require('../middlewere/authMiddleware');

// ─── Multer configuration (memory storage — no local disk writes) ─────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|ogg/;
  const ext = file.originalname.split('.').pop().toLowerCase();
  const extname = allowedTypes.test(ext);
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only images and videos are allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter,
});

// ─── Cloudinary upload helper (from buffer) ────────────────────────────
const uploadToCloudinary = (buffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const isVideo = mimetype.startsWith('video/');
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: isVideo ? 'video' : 'image',
        folder: 'hero',
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result || !result.secure_url) {
          return reject(new Error('Cloudinary upload failed: no URL returned'));
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

// ─── Public routes ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const slides = await HeroSlide.find({ active: true }).sort({ order: 1 });
    res.json(slides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Admin routes ──────────────────────────────────────────────

// CREATE a new slide
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const slide = new HeroSlide(req.body);
    await slide.save();
    res.status(201).json(slide);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE a slide
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const slide = await HeroSlide.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slide) return res.status(404).json({ message: 'Slide not found' });
    res.json(slide);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a slide
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const slide = await HeroSlide.findByIdAndDelete(req.params.id);
    if (!slide) return res.status(404).json({ message: 'Slide not found' });
    res.json({ message: 'Slide deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// BULK UPDATE (reorder)
router.put('/bulk', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { slides } = req.body;
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ message: 'Invalid data: expected an array of slides' });
    }
    const bulkOps = slides.map(slide => ({
      updateOne: {
        filter: { _id: slide._id },
        update: { $set: { order: slide.order } },
      },
    }));
    const result = await HeroSlide.bulkWrite(bulkOps);
    res.json({
      message: `Updated ${result.modifiedCount} slides`,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ─── Upload image/video to Cloudinary + save URL in DB ─────────────────
// If `slideId` is passed in the form data, the uploaded file's URL is
// written straight onto that slide's `imageUrl` field. Otherwise the
// route just returns the URL so the client can include it when creating
// a new slide via POST /.
router.post('/upload', verifyToken, verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const url = await uploadToCloudinary(req.file.buffer, req.file.mimetype);

    const { slideId } = req.body;
    if (slideId) {
      const slide = await HeroSlide.findByIdAndUpdate(
        slideId,
        { imageUrl: url },
        { new: true }
      );
      if (!slide) return res.status(404).json({ message: 'Slide not found' });
      return res.json({ url, slide });
    }

    res.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
});

module.exports = router;