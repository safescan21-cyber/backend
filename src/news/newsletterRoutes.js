const express = require('express');
const router = express.Router();
const Subscriber = require('./Subscriber');
const { sendSubscriptionEmail } = require('../users/email');
const { verifyToken, verifyAdmin } = require('../middlewere/authMiddleware');
const crypto = require('crypto');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// One-click unsubscribe link (served by this API, so no frontend page is needed)
const unsubscribeUrl = (req, token) =>
  `${process.env.API_URL || `${req.protocol}://${req.get('host')}`}/api/newsletter/unsubscribe/${token}`;

// Email problems must never fail the subscription itself
const sendConfirmationSafely = (email, url) => {
  try {
    sendSubscriptionEmail(email, url);
  } catch (err) {
    console.error('Subscription email failed:', err.message);
  }
};

// ── Subscribe (no login required) ──
router.post('/subscribe', async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    let subscription = await Subscriber.findOne({ email });

    if (subscription?.isActive) {
      return res.status(200).json({ message: "You're already subscribed. Thanks!" });
    }

    const token = crypto.randomBytes(32).toString('hex');

    if (subscription) {
      // Reactivate
      subscription.isActive = true;
      subscription.unsubscribeToken = token;
      await subscription.save();
      sendConfirmationSafely(email, unsubscribeUrl(req, token));
      return res.status(200).json({ message: 'Welcome back! Your subscription is active again.' });
    }

    try {
      subscription = await Subscriber.create({ email, unsubscribeToken: token });
    } catch (err) {
      // Two quick clicks can race; the second one hits the unique index
      if (err.code === 11000) {
        return res.status(200).json({ message: "You're already subscribed. Thanks!" });
      }
      throw err;
    }

    sendConfirmationSafely(email, unsubscribeUrl(req, token));

    res.status(201).json({
      message: 'Subscribed successfully! Please check your email for confirmation.',
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: 'Could not subscribe right now. Please try again.' });
  }
});

// ── One-click unsubscribe from the email link ──
router.get('/unsubscribe/:token', async (req, res) => {
  const page = (title, text) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:40px 16px;">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;padding:28px;text-align:center;color:#333;">
<h2 style="margin-top:0;">${title}</h2><p>${text}</p>
<p><a href="${process.env.FRONTEND_URL || '/'}" style="color:#4CAF50;">Back to Food Pharma Machinery</a></p></div></body></html>`;

  try {
    const token = String(req.params.token || '');
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).send(page('Invalid link', 'This unsubscribe link is not valid.'));
    }
    const subscription = await Subscriber.findOne({ unsubscribeToken: token });
    if (!subscription) {
      return res.status(404).send(page('Link expired', 'This unsubscribe link has already been used or has expired.'));
    }
    subscription.isActive = false;
    await subscription.save();
    res.status(200).send(page("You've been unsubscribed", "You won't receive our newsletter any more. You can subscribe again at any time from our website."));
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send(page('Something went wrong', 'Please try again later.'));
  }
});

// ── Unsubscribe (by email) ──
router.post('/unsubscribe', async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const subscription = await Subscriber.findOne({ email });
    if (!subscription) {
      return res.status(404).json({ message: 'Email not found' });
    }

    subscription.isActive = false;
    await subscription.save();

    res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── (Admin) List all active subscriptions ──
router.get('/subscriptions', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const subscriptions = await Subscriber.find({ isActive: true }).select('-unsubscribeToken');
    res.status(200).json({ subscriptions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
