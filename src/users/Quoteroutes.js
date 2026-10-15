// backend/routes/quoteRoutes.js  (CommonJS)
// Receives the Get-a-Quote form and emails it to your inbox.
//
// 1) npm install nodemailer
// 2) Add to backend .env:
//      SMTP_HOST=smtp.gmail.com
//      SMTP_PORT=465
//      SMTP_USER=safescan21@gmail.com
//      SMTP_PASS=<Gmail App Password, 16 characters>
//      QUOTE_TO=safescan21@gmail.com
// 3) In your main server file (app.js / server.js):
//      app.use('/api/quote', require('./routes/quoteRoutes'));
//    (make sure app.use(express.json()) comes before it)

const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (Number(process.env.SMTP_PORT) || 465) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const clean = (s, max) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

// Simple in-memory limit: 5 requests per 10 minutes per IP
const hits = new Map();
const rateLimit = (req, res, next) => {
  const now = Date.now();
  const ip = req.ip;
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) {
    return res.status(429).json({ message: 'Too many requests. Please try again later.' });
  }
  recent.push(now);
  hits.set(ip, recent);
  next();
};

router.post('/', rateLimit, async (req, res) => {
  try {
    const b = req.body || {};

    // Honeypot: bots fill this hidden field. Pretend success, send nothing.
    if (b.website) return res.json({ success: true });

    const name = clean(b.name, 100);
    const company = clean(b.company, 150);
    const phone = clean(b.phone, 30);
    const email = clean(b.email, 150);
    const product = clean(b.product, 200);
    const message = String(b.message ?? '').trim().slice(0, 3000);

    if (!name || !phone || !email || !product) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const to = process.env.QUOTE_TO || process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"Food Pharma Machinery Website" <${process.env.SMTP_USER}>`,
      to,
      replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
      subject: `New quote request: ${product}`,
      text: [
        `Name: ${name}`,
        `Company: ${company}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Product: ${product}`,
        '',
        message,
      ].join('\n'),
      html: `
        <h2>New quote request</h2>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><b>Name</b></td><td>${esc(name)}</td></tr>
          <tr><td><b>Company</b></td><td>${esc(company)}</td></tr>
          <tr><td><b>Phone</b></td><td>${esc(phone)}</td></tr>
          <tr><td><b>Email</b></td><td>${esc(email)}</td></tr>
          <tr><td><b>Product</b></td><td>${esc(product)}</td></tr>
        </table>
        <p style="white-space:pre-wrap">${esc(message)}</p>`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Quote email failed:', err.message);
    res.status(500).json({ message: 'Could not send your request right now.' });
  }
});

module.exports = router;