// src/users/otp.js — one-time email codes for "Login with email OTP"
const crypto = require('crypto');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const OTP_TTL_MS = 10 * 60 * 1000; // code valid for 10 minutes
const OTP_RESEND_MS = 60 * 1000; // wait 60 seconds between codes
const OTP_MAX_ATTEMPTS = 5; // wrong guesses before the code is burned

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  // MongoDB removes the document by itself once this time has passed
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});
const OtpCode = mongoose.models.OtpCode || mongoose.model('OtpCode', otpSchema);

const secret = () => process.env.JWT_SECRET || 'fallback_secret_key';

// 6-digit code from a cryptographically secure source
const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

const hashOtp = (email, code) =>
  crypto.createHash('sha256').update(`${email}:${code}:${secret()}`).digest('hex');

const safeEqual = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Same SMTP settings as the contact form (SMTP_USER / SMTP_PASS in .env)
const getTransport = () => {
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

const sendOtpEmail = async (to, code) => {
  const mail = getTransport();
  if (!mail) throw new Error('SMTP user/password not set in .env');
  const brand = process.env.SITE_NAME || 'Food Pharma Machinery';
  await mail.transport.sendMail({
    from: `"${brand}" <${mail.user}>`,
    to,
    subject: `${code} is your ${brand} login code`,
    text: `Your login code is ${code}\n\nIt is valid for 10 minutes. If you did not ask for it, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="margin:0 0 8px;color:#111827">${brand}</h2>
      <p style="color:#374151;margin:0 0 16px">Use this code to log in:</p>
      <p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:0 0 16px;color:#4f46e5">${code}</p>
      <p style="color:#6b7280;font-size:13px;margin:0">It is valid for 10 minutes. If you did not ask for it, you can ignore this email.</p>
    </div>`,
  });
};

module.exports = {
  OtpCode,
  OTP_TTL_MS,
  OTP_RESEND_MS,
  OTP_MAX_ATTEMPTS,
  generateOtp,
  hashOtp,
  safeEqual,
  sendOtpEmail,
};