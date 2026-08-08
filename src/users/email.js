const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendResetEmail = async (to, token, name) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

  const mailOptions = {
    from: `"Your App" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset Request',
    html: `
      <h2>Hello ${name || 'User'},</h2>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#6C63FF;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return false;
  }
};

module.exports = sendResetEmail;