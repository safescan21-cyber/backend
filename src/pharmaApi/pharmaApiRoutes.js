// /api/pharma-apis
//   GET  /             public list (active only): ?q= search, ?category=, ?page=, ?limit=
//   GET  /categories   public: categories in use with counts
//   GET  /admin/all    admin: every API incl. hidden ones
//   GET  /:slugOrId    public detail (hidden ones only for admins)
//   POST /             admin create · PATCH /:id admin update · DELETE /:id admin delete
const express = require('express');
const mongoose = require('mongoose');
const PharmaApi = require('./PharmaApi');
const { verifyToken, verifyAdmin, userFromRequest } = require('../middlewere/authMiddleware');
const { cleanDocuments } = require('../documents/documentFiles');
const { pingIndexNow } = require('../utils/indexnow');

const router = express.Router();

const TEXT_FIELDS = {
  name: 120, chemicalName: 400, casNumber: 20, molecularFormula: 80, molecularWeight: 40, composition: 2000,
  category: 60, form: 60, appearance: 200, solubility: 300, storage: 200, shelfLife: 60, packaging: 200,
  moq: 60, price: 60, description: 10000,
};
const GRADES = ['IP', 'BP', 'USP', 'EP', 'JP', 'In-house'];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'api';
const isId = (s) => mongoose.Types.ObjectId.isValid(s) && /^[a-f0-9]{24}$/i.test(s);

// Only known fields, as plain strings/arrays of the right size (admin input is not trusted blindly)
const cleanBody = (body = {}) => {
  const out = {};
  for (const [k, max] of Object.entries(TEXT_FIELDS)) {
    if (body[k] === undefined) continue;
    if (body[k] !== null && typeof body[k] !== 'string' && typeof body[k] !== 'number') continue;
    out[k] = String(body[k] ?? '').trim().slice(0, max);
  }
  if (Array.isArray(body.grades)) out.grades = [...new Set(body.grades.filter((g) => GRADES.includes(g)))];
  if (Array.isArray(body.images)) out.images = body.images.filter((u) => typeof u === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(u)).slice(0, 10);
  if (Array.isArray(body.specifications)) {
    out.specifications = body.specifications
      .filter((s) => s && typeof s.key === 'string' && typeof s.value === 'string' && s.key.trim() && s.value.trim())
      .slice(0, 40)
      .map((s) => ({ key: s.key.trim().slice(0, 80), value: s.value.trim().slice(0, 300) }));
  }
  const docs = cleanDocuments(body.documents);
  if (docs !== undefined) out.documents = docs;
  if (typeof body.active === 'boolean') out.active = body.active;
  if (typeof body.sellOnline === 'boolean') out.sellOnline = body.sellOnline;
  if (body.unitPrice !== undefined) out.unitPrice = Math.max(0, Math.min(1e8, Math.round(Number(body.unitPrice) * 100) / 100 || 0));
  if (['kg', 'g', 'L'].includes(body.unit)) out.unit = body.unit;
  if (body.minOrderQty !== undefined) out.minOrderQty = Math.max(1, Math.min(100000, parseInt(body.minOrderQty, 10) || 1));
  return out;
};

const uniqueSlug = async (base, exceptId) => {
  let slug = slugify(base);
  for (let i = 2; await PharmaApi.exists({ slug, ...(exceptId && { _id: { $ne: exceptId } }) }); i++) slug = `${slugify(base)}-${i}`;
  return slug;
};

const LIST_FIELDS = 'name slug chemicalName casNumber molecularFormula molecularWeight composition category grades form images moq sellOnline unitPrice unit minOrderQty updatedAt';

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Math.min(1000, parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 24));
    const filter = { active: true };
    if (typeof req.query.category === 'string' && req.query.category && req.query.category !== 'all') filter.category = req.query.category.slice(0, 60);
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      const re = new RegExp(escapeRe(req.query.q.trim().slice(0, 80)), 'i');
      filter.$or = [{ name: re }, { chemicalName: re }, { casNumber: re }, { composition: re }, { molecularFormula: re }, { category: re }];
    }
    const [items, total] = await Promise.all([
      PharmaApi.find(filter).select(LIST_FIELDS).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      PharmaApi.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    console.error('Pharma API list error:', error);
    res.status(500).json({ message: 'Could not load the API list' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const rows = await PharmaApi.aggregate([{ $match: { active: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
    res.json(rows.map((r) => ({ category: r._id, count: r.count })));
  } catch (error) {
    res.status(500).json({ message: 'Could not load categories' });
  }
});

router.get('/admin/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const items = await PharmaApi.find().select(`${LIST_FIELDS} active createdAt documents`).sort({ updatedAt: -1 }).limit(2000).lean();
    res.json({ items, total: items.length });
  } catch (error) {
    res.status(500).json({ message: 'Could not load the API list' });
  }
});

router.get('/:slugOrId', async (req, res) => {
  try {
    const key = String(req.params.slugOrId || '').toLowerCase().slice(0, 100);
    const query = isId(key) ? { _id: key } : /^[a-z0-9-]+$/.test(key) ? { slug: key } : null;
    if (!query) return res.status(404).json({ message: 'API not found' });
    const item = await PharmaApi.findOne(query).select('-author').lean();
    if (!item) return res.status(404).json({ message: 'API not found' });
    if (!item.active) {
      const viewer = userFromRequest(req);
      if (viewer?.role !== 'admin') return res.status(404).json({ message: 'API not found' });
    }
    res.json({ item });
  } catch (error) {
    console.error('Pharma API detail error:', error);
    res.status(500).json({ message: 'Could not load the API' });
  }
});

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const data = cleanBody(req.body);
    if (!data.name || !data.category) return res.status(400).json({ message: 'Name and category are required.' });
    data.slug = await uniqueSlug(data.name);
    data.author = req.userId;
    const item = await PharmaApi.create(data);
    pingIndexNow([`/pharma-api/${item.slug}`, '/pharma-api']);
    res.status(201).json({ item });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors)[0]?.message || 'Invalid data' });
    console.error('Pharma API create error:', error);
    res.status(500).json({ message: 'Could not save the API' });
  }
});

router.patch('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'API not found' });
    const data = cleanBody(req.body);
    if ('name' in data && !data.name) return res.status(400).json({ message: 'Name is required.' });
    if ('category' in data && !data.category) return res.status(400).json({ message: 'Category is required.' });
    // the web address (slug) stays as created, so shared links and Google results keep working
    const item = await PharmaApi.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
    if (!item) return res.status(404).json({ message: 'API not found' });
    pingIndexNow([`/pharma-api/${item.slug}`]);
    res.json({ item });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors)[0]?.message || 'Invalid data' });
    console.error('Pharma API update error:', error);
    res.status(500).json({ message: 'Could not update the API' });
  }
});

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'API not found' });
    const item = await PharmaApi.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'API not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete the API' });
  }
});

module.exports = router;
module.exports.GRADES = GRADES;
