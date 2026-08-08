const nodemailer = require('nodemailer');

// Create transporter with better configuration
const createTransporter = () => {
  // For development without email credentials
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Email credentials missing. Using console logging mode.');
    return null;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Increase timeout and retry options
    pool: true,
    maxConnections: 1,
    maxMessages: 5,
    rateDelta: 1000,
    rateLimit: 5,
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter verification failed:', error.message);
    } else {
      console.log('✅ Email transporter is ready to send messages');
    }
  });

  return transporter;
};

// Send password reset email
const sendResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
  
  // Log the reset link for development (always visible)
  console.log('\n' + '='.repeat(60));
  console.log('🔐 PASSWORD RESET LINK');
  console.log('='.repeat(60));
  console.log(`User: ${userName} (${email})`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log('='.repeat(60) + '\n');

  // If no email credentials, just log and return true (for development)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('📧 Email not sent - Missing credentials. Use the URL above.');
    return true; // Return true to continue flow
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.log('📧 Email not sent - Transporter creation failed. Use the URL above.');
    return true;
  }

  const mailOptions = {
    from: `"App Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request - Action Required',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding: 30px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px 10px 0 0;
            margin: -20px -20px 20px -20px;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            color: rgba(255,255,255,0.9);
            margin: 10px 0 0;
          }
          .content {
            padding: 30px 20px;
          }
          .button {
            display: inline-block;
            padding: 14px 35px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            margin: 25px 0;
            font-weight: bold;
            text-align: center;
            font-size: 16px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          }
          .link-container {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            word-break: break-all;
            border: 1px solid #e0e0e0;
          }
          .link-container a {
            color: #667eea;
            text-decoration: none;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 25px 0;
            border-radius: 5px;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
            margin-top: 20px;
          }
          .logo {
            font-size: 48px;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔐</div>
            <h1>Password Reset Request</h1>
            <p>Secure password recovery</p>
          </div>
          <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <div class="link-container">
              <a href="${resetUrl}">${resetUrl}</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Information:</strong><br>
              • This link will expire in <strong>1 hour</strong><br>
              • If you didn't request this, please ignore this email<br>
              • Never share this link with anyone<br>
              • For security, this link can only be used once
            </div>
            
            <p>If you have any issues, please contact our support team.</p>
            
            <p>Best regards,<br><strong>Support Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request for ${userName}
      
      Click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this, please ignore this email.
      
      Best regards,
      Support Team
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully!');
    console.log(`📧 Sent to: ${email}`);
    console.log(`🆔 Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.log('📧 Use the console URL above for testing.');
    return false;
  }
};

// Send welcome email on registration (optional)
const sendWelcomeEmail = async (email, userName) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`Welcome email would be sent to: ${email}`);
    return true;
  }

  const transporter = createTransporter();
  if (!transporter) return false;

  const mailOptions = {
    from: `"App Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Our Platform! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Welcome!</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 8px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <h2>Welcome ${userName}! 🎉</h2>
            <p>Thank you for joining our platform. We're excited to have you on board!</p>
            <p>Get started by exploring our features and connecting with others.</p>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/login" class="button">Get Started</a>
            </div>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error.message);
    return false;
  }
};

module.exports = { sendResetEmail, sendWelcomeEmail };