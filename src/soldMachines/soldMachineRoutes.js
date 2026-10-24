// /api/sold-machines (admin only): the list of sold machines with their serial numbers.
//   GET   /                 list (?q= search, ?status=active|cancelled, ?from= ?to= dates)
//   GET   /export.xlsx      same list as Excel      GET /export.pdf   as PDF
//   POST  /                 record a sale made outside the website (one serial per unit)
//   PATCH /:id              notes, customer details, status
//   POST  /backfill         serials for orders already shipped/delivered before this existed
//   POST  /send-report      send the daily email now
const express = require('express');
const { verifyToken, verifyAdmin } = require('../middlewere/authMiddleware');
const Order = require('../orders/ordersmodel');
const { SoldMachine } = require('./SoldMachine');
const { recordSale, assignSerials } = require('./serials');
const { buildXlsx, buildPdf } = require('./soldExports');
const { sendReport } = require('./dailyReport');
const { soldReportTo } = require('../users/email');

const router = express.Router();
router.use(verifyToken, verifyAdmin);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const filterFrom = (query) => {
  const f = {};
  const q = String(query.q || '').trim().slice(0, 100);
  if (q) {
    const re = new RegExp(escapeRe(q), 'i');
    f.$or = [{ serialNumber: re }, { productName: re }, { modelNumber: re }, { orderNumber: re }, { 'customer.name': re }, { 'customer.company': re }, { 'customer.email': re }, { 'customer.phone': re }];
  }
  if (['active', 'cancelled'].includes(query.status)) f.status = query.status;
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(`${query.to}T23:59:59.999+05:30`) : null;
  if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
    f.soldAt = {};
    if (from && !Number.isNaN(from.getTime())) f.soldAt.$gte = new Date(`${query.from}T00:00:00+05:30`);
    if (to && !Number.isNaN(to.getTime())) f.soldAt.$lte = to;
  }
  return f;
};
const listRows = (query) => SoldMachine.find(filterFrom(query)).sort({ soldAt: -1, serialNumber: -1 }).limit(20000).lean();
const fileDate = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const CUSTOMER_FIELDS = { name: 150, company: 150, email: 150, phone: 30, city: 100, state: 100 };
const cleanCustomer = (c = {}) =>
  Object.fromEntries(Object.entries(CUSTOMER_FIELDS).map(([k, max]) => [k, String(c?.[k] ?? '').trim().slice(0, max)]));

router.get('/', async (req, res) => {
  try {
    const items = await listRows(req.query);
    const [active, cancelled] = await Promise.all([SoldMachine.countDocuments({ status: 'active' }), SoldMachine.countDocuments({ status: 'cancelled' })]);
    res.json({ items, totals: { active, cancelled }, reportTo: soldReportTo() });
  } catch (error) {
    console.error('Sold machines list failed:', error.message);
    res.status(500).json({ message: 'Could not load the sold machines' });
  }
});

router.get('/export.xlsx', async (req, res) => {
  try {
    const buf = await buildXlsx(await listRows(req.query));
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="sold-machines-${fileDate()}.xlsx"` });
    res.send(buf);
  } catch (error) {
    console.error('Sold machines Excel failed:', error.message);
    res.status(500).json({ message: 'Could not create the Excel file' });
  }
});

router.get('/export.pdf', async (req, res) => {
  try {
    const buf = await buildPdf(await listRows(req.query));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="sold-machines-${fileDate()}.pdf"` });
    res.send(buf);
  } catch (error) {
    console.error('Sold machines PDF failed:', error.message);
    res.status(500).json({ message: 'Could not create the PDF' });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const customer = cleanCustomer(b.customer);
    if (!customer.name) return res.status(400).json({ message: 'Enter the customer name.' });
    const items = await recordSale({
      productId: /^[a-f0-9]{24}$/i.test(String(b.productId || '')) ? b.productId : '',
      productName: String(b.productName || '').slice(0, 200),
      modelNumber: String(b.modelNumber || '').slice(0, 60),
      unitPrice: Number(b.unitPrice) || undefined,
      quantity: b.quantity,
      customer,
      soldAt: b.soldAt || undefined,
      notes: String(b.notes || '').slice(0, 1000),
      createdBy: req.userId,
    });
    res.status(201).json({ items });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error('Record sale failed:', error.message);
    res.status(500).json({ message: 'Could not save the sale' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const set = {};
    if (b.customer) for (const [k, v] of Object.entries(cleanCustomer({ ...b.customer }))) if (k in b.customer) set[`customer.${k}`] = v;
    if (typeof b.notes === 'string') set.notes = b.notes.trim().slice(0, 1000);
    if (['active', 'cancelled'].includes(b.status)) set.status = b.status;
    if (typeof b.modelNumber === 'string') set.modelNumber = b.modelNumber.trim().slice(0, 60);
    const item = await SoldMachine.findByIdAndUpdate(req.params.id, { $set: set }, { returnDocument: 'after', runValidators: true }).lean().catch(() => null);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ item });
  } catch (error) {
    console.error('Sold machine update failed:', error.message);
    res.status(500).json({ message: 'Could not save' });
  }
});

router.post('/backfill', async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: { $in: ['shipped', 'delivered'] } }).sort({ createdAt: 1 });
    let created = 0;
    for (const order of orders) created += (await assignSerials(order)).length;
    res.json({ orders: orders.length, created });
  } catch (error) {
    console.error('Serial backfill failed:', error.message);
    res.status(500).json({ message: 'Could not create the serial numbers' });
  }
});

router.post('/send-report', async (req, res) => {
  try {
    const r = await sendReport({ since: new Date(Date.now() - 24 * 3600 * 1000) });
    res.json({ sent: true, to: soldReportTo(), ...r });
  } catch (error) {
    console.error('Sold report send failed:', error.message);
    res.status(500).json({ message: `Could not send the email: ${error.message}` });
  }
});

module.exports = router;
