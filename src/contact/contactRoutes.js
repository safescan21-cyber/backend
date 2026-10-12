// src/contact/contactRoutes.js  — mounted in index.js as: app.use("/api", contactRoutes)
// POST /api/contact  { name, email, subject, message }  → emailed to CONTACT_TO
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const router = express.Router();

const CONTACT_TO = process.env.CONTACT_TO || 'safescan21@gmail.com';

// Keep a copy in MongoDB so no enquiry is lost even if email fails
const contactSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    subject: String,
    message: String,
    emailed: { type: Boolean, default: false },
    ip: String,
  },
  { timestamps: true }
);
const ContactMessage = mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactSchema);

// Accepts any of the usual env names so it works with the existing .env
const getMailConfig = () => {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.MAIL_PASS || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return {
    user,
    transport: nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: { user, pass: String(pass).replace(/\s+/g, '') },
    }),
  };
};

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// light per-IP rate limit: 5 messages / 15 min
const hits = new Map();
const rateLimited = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
};

router.post('/contact', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const subject = String(req.body.subject || '').trim() || 'New website enquiry';
    const message = String(req.body.message || '').trim();

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email and message are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (message.length > 5000 || name.length > 200 || subject.length > 300) {
      return res.status(400).json({ message: 'Your message is too long.' });
    }
    if (rateLimited(req.ip)) {
      return res.status(429).json({ message: 'Too many messages. Please try again in a few minutes.' });
    }

    // Keep a copy in the database (never blocks or breaks the email if Mongo is unavailable)
    let saved = null;
    try {
      if (mongoose.connection.readyState === 1) {
        saved = await ContactMessage.create({ name, email, subject, message, ip: req.ip });
      }
    } catch (dbErr) {
      console.error('Contact: could not save to database:', dbErr.message);
    }

    const mail = getMailConfig();
    if (!mail) {
      console.error('Contact: SMTP user/password not set in .env — message saved only in database');
      return res.status(500).json({ message: 'We could not send your message right now. Please use WhatsApp or try later.' });
    }

    await mail.transport.sendMail({
      from: `"Website Contact" <${mail.user}>`,
      to: CONTACT_TO,
      replyTo: `"${name.replace(/["<>\r\n]/g, '')}" <${email}>`,
      subject: `[Website] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
      html: `<h3>New website enquiry</h3>
        <p><b>Name:</b> ${esc(name)}<br><b>Email:</b> ${esc(email)}<br><b>Subject:</b> ${esc(subject)}</p>
        <p style="white-space:pre-wrap">${esc(message)}</p>`,
    });

    if (saved) {
      saved.emailed = true;
      saved.save().catch(() => {});
    }

    return res.status(200).json({ message: 'Message sent successfully.' });
  } catch (err) {
    console.error('Contact error:', err.message || err);
    return res.status(500).json({ message: 'We could not send your message right now. Please use WhatsApp or try later.' });
  }
});

module.exports = router;