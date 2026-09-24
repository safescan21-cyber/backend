// services/email.js
const nodemailer = require('nodemailer');

// ─── SMTP Transporter with connection pooling ───
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,            // enable connection pooling
  maxConnections: 5,     // max concurrent connections
  maxMessages: 100,      // reuse connection for up to 100 messages
  rateLimit: true,
});

const from = process.env.SMTP_FROM || `"PharmaMachine" <${process.env.SMTP_USER}>`;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── In‑Memory Queue ──────────────────────────────────
const emailQueue = {
  tasks: [],
  processing: false,

  // Add a task (a function that returns a promise)
  add(task) {
    this.tasks.push(task);
    this.process();
  },

  // Process tasks one by one
  async process() {
    if (this.processing || this.tasks.length === 0) return;
    this.processing = true;

    const task = this.tasks.shift();
    try {
      await task();
      console.log('✅ Email processed successfully');
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
    }

    this.processing = false;
    // Process next task (if any)
    setImmediate(() => this.process());
  }
};

// ─── Helpers to send emails ───────────────────────────

const sendResetEmail = (to, token, name) => {
  const resetLink = `${frontendUrl}/resetpassword/${token}`; // ✅ matches frontend route
  const html = `
    <h2>Hello ${name || 'User'},</h2>
    <p>You requested a password reset. Click the link below to set a new password:</p>
    <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#6C63FF;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  emailQueue.add(() =>
    transporter.sendMail({
      from,
      to,
      subject: 'Password Reset Request',
      html,
    })
  );
  return true;
};

const sendWelcomeEmail = (to, name) => {
  const loginLink = `${frontendUrl}/login`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">Hello ${name || 'there'}!</h2>
      <p>Thank you for registering with us. We're thrilled to have you on board.</p>
      <p>You can now explore all our features and start your journey.</p>
      <a href="${loginLink}" style="display:inline-block;padding:10px 20px;background:#4CAF50;color:#fff;text-decoration:none;border-radius:5px;">Go to Login</a>
      <p>Best regards,<br/>The Team</p>
    </div>
  `;

  emailQueue.add(() =>
    transporter.sendMail({
      from,
      to,
      subject: 'Welcome to Our Platform! 🎉',
      html,
    })
  );
  return true;
};

const sendSubscriptionEmail = (to) => {
  const unsubscribeLink = `${frontendUrl}/unsubscribe?email=${encodeURIComponent(to)}`;
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>You're now subscribed!</h2>
      <p>Thank you for subscribing to our newsletter. You'll receive updates and exclusive offers.</p>
      <p><a href="${unsubscribeLink}" style="display:inline-block;padding:8px 16px;background:#f44336;color:#fff;text-decoration:none;border-radius:4px;">Unsubscribe</a></p>
    </div>
  `;

  emailQueue.add(() =>
    transporter.sendMail({
      from,
      to,
      subject: 'Subscription Confirmed ✅',
      html,
    })
  );
  return true;
};

const sendContactEmail = (name, email, subject, message) => {
  const contactTo = process.env.CONTACT_EMAIL || 'admin@yourdomain.com';
  const html = `
    <h2>New Contact Message</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
    <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
    <p><strong>Message:</strong><br/>${message}</p>
  `;

  emailQueue.add(() =>
    transporter.sendMail({
      from,
      to: contactTo,
      replyTo: email,
      subject: `Contact Form: ${subject || 'New Message'}`,
      html,
    })
  );
  return true;
};

module.exports = {
  sendResetEmail,
  sendWelcomeEmail,
  sendSubscriptionEmail,
  sendContactEmail,
};