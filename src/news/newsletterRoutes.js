const express = require('express');
const router = express.Router();
const Subscriber = require('./Subscriber');
const { sendSubscriptionEmail } = require('../users/email');
const crypto = require('crypto');

// ── Subscribe (no login required) ──
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing subscription
    let subscription = await Subscriber.findOne({ email: normalizedEmail });

    if (subscription) {
      if (subscription.isActive) {
        return res.status(409).json({ message: 'Email already subscribed' });
      } else {
        // Reactivate
        subscription.isActive = true;
        subscription.unsubscribeToken = crypto.randomBytes(32).toString('hex');
        await subscription.save();
        // Send confirmation again (non‑blocking)
        sendSubscriptionEmail(normalizedEmail).catch(err =>
          console.error('Conf email failed:', err)
        );
        return res.status(200).json({ message: 'Subscription reactivated' });
      }
    }

    // New subscription
    const token = crypto.randomBytes(32).toString('hex');
    subscription = new Subscriber({
      email: normalizedEmail,
      unsubscribeToken: token,
    });
    await subscription.save();

    // Send confirmation email (non‑blocking)
    sendSubscriptionEmail(normalizedEmail).catch(err =>
      console.error('Conf email failed:', err)
    );

    res.status(201).json({
      message: 'Subscribed successfully! Please check your email for confirmation.',
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Unsubscribe (by email) ──
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const subscription = await Subscriber.findOne({ email: email.toLowerCase().trim() });
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
// ⚠️ Add your verifyAdmin middleware if you have one
router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await Subscriber.find({ isActive: true }).select('-unsubscribeToken');
    res.status(200).json({ subscriptions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;