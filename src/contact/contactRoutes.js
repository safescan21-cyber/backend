const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../users/email');

router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required.' });
    }

    // Send email (non‑blocking)
    const sent = await sendContactEmail(name, email, subject, message);

    if (!sent) {
      return res.status(500).json({ message: 'Failed to send email. Please try again later.' });
    }

    res.status(200).json({ message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error('Contact route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;