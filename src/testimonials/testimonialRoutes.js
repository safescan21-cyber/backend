// /api/testimonials
//   GET    /             public: approved testimonials (no emails)
//   POST   /submit       public: a customer submits one (pending until approved)
//   GET    /admin/all    admin: every testimonial incl. pending / rejected
//   POST   /             admin: add one (approved straight away)
//   PATCH  /:id          admin: edit, approve, reject, feature
//   DELETE /:id          admin: delete
const express = require('express');
const mongoose = require('mongoose');
const Testimonial = require('./Testimonial');
const Order = require('../orders/ordersmodel');
const { verifyToken, verifyAdmin } = require('../middlewere/authMiddleware');
const { tooMany } = require('../utils/rateLimit');
const { sendTestimonialNotice } = require('../users/email');

const router = express.Router();
const PUBLIC_FIELDS = 'name role company city quote rating photo logo verifiedBuyer featured approvedAt';
const TEXT = { name: 80, role: 80, company: 120, city: 60, quote: 1000 };
const isId = (s) => typeof s === 'string' && mongoose.Types.ObjectId.isValid(s) && /^[a-f0-9]{24}$/i.test(s);
const isImage = (u) => typeof u === 'string' && (u === '' || /^https:\/\/res\.cloudinary\.com\/[^\s"'<>]+$/.test(u));
const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

const cleanText = (body = {}) => {
  const out = {};
  for (const [k, n] of Object.entries(TEXT)) if (body[k] !== undefined && (typeof body[k] === 'string' || typeof body[k] === 'number')) out[k] = clip(body[k], n);
  if (body.rating !== undefined) out.rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 5));
  return out;
};

router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 24));
    const items = await Testimonial.find({ status: 'approved' }).select(PUBLIC_FIELDS).sort({ featured: -1, approvedAt: -1 }).limit(limit).lean();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Could not load testimonials' });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const ip = req.ip || 'unknown';
    if (tooMany(`testimonial:${ip}`, 3, 60 * 60 * 1000)) return res.status(429).json({ message: 'Too many submissions. Please try again later.' });
    if (req.body?.website) return res.status(201).json({ message: 'Thank you!' }); // hidden field: bots fill it in
    const data = cleanText(req.body);
    const email = clip(req.body?.email, 200).toLowerCase();
    if (!data.name || data.name.length < 2) return res.status(400).json({ message: 'Please enter your name.' });
    if (!data.quote || data.quote.length < 20) return res.status(400).json({ message: 'Please write at least 20 characters about your experience.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email (it is never shown).' });
    if (req.body?.consent !== true) return res.status(400).json({ message: 'Please allow us to publish your testimonial.' });
    const verifiedBuyer = Boolean(await Order.exists({ $or: [{ email }, { 'customerInfo.email': email }] }));
    const item = await Testimonial.create({ ...data, email, consent: true, verifiedBuyer, status: 'pending', source: 'customer' });
    try { sendTestimonialNotice(item); } catch (e) { console.error('Testimonial notice failed:', e.message); }
    res.status(201).json({ message: 'Thank you! Your testimonial will appear after a quick review.' });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Please check the form and try again.' });
    console.error('Testimonial submit error:', error);
    res.status(500).json({ message: 'Could not send your testimonial. Please try again.' });
  }
});

router.get('/admin/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const items = await Testimonial.find().sort({ createdAt: -1 }).limit(1000).lean();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Could not load testimonials' });
  }
});

const adminFields = (body = {}) => {
  const out = cleanText(body);
  for (const k of ['photo', 'logo']) if (body[k] !== undefined) { if (!isImage(body[k])) throw Object.assign(new Error(`${k} must be an uploaded image`), { status: 400 }); out[k] = body[k]; }
  if (typeof body.featured === 'boolean') out.featured = body.featured;
  if (typeof body.consent === 'boolean') out.consent = body.consent;
  if (['pending', 'approved', 'rejected'].includes(body.status)) out.status = body.status;
  if (body.email !== undefined) out.email = clip(body.email, 200).toLowerCase();
  return out;
};

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const data = adminFields(req.body);
    if (!data.name || !data.quote || data.quote.length < 20) return res.status(400).json({ message: 'Name and a quote of at least 20 characters are required.' });
    if (req.body?.consent !== true) return res.status(400).json({ message: "Tick that the customer agreed to be published." });
    const status = data.status || 'approved';
    const item = await Testimonial.create({ ...data, consent: true, source: 'admin', status, ...(status === 'approved' && { approvedAt: new Date() }) });
    res.status(201).json({ item });
  } catch (error) {
    if (error.status === 400 || error.name === 'ValidationError') return res.status(400).json({ message: error.status ? error.message : 'Please check the fields.' });
    console.error('Testimonial create error:', error);
    res.status(500).json({ message: 'Could not save the testimonial' });
  }
});

router.patch('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Testimonial not found' });
    const data = adminFields(req.body);
    const current = await Testimonial.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Testimonial not found' });
    if (data.status === 'approved' && !(data.consent ?? current.consent)) return res.status(400).json({ message: 'This customer has not agreed to be published.' });
    if (data.status === 'approved' && current.status !== 'approved') data.approvedAt = new Date();
    Object.assign(current, data);
    await current.save();
    res.json({ item: current });
  } catch (error) {
    if (error.status === 400 || error.name === 'ValidationError') return res.status(400).json({ message: error.status ? error.message : 'Please check the fields.' });
    console.error('Testimonial update error:', error);
    res.status(500).json({ message: 'Could not update the testimonial' });
  }
});

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Testimonial not found' });
    const item = await Testimonial.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Testimonial not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete the testimonial' });
  }
});

module.exports = router;
