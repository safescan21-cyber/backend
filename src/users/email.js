// services/email.js
const nodemailer = require('nodemailer');
const { generateInvoicePdf } = require('../orders/invoice');

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

// unsubscribeUrl: one-click link built by the newsletter route (token based)
const sendSubscriptionEmail = (to, unsubscribeUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#333; line-height:1.5;">
      <h2 style="color:#4CAF50;">You're subscribed! 🎉</h2>
      <p>Thanks for subscribing to the Food Pharma Machinery newsletter. You'll get regulatory updates, machine specs and pharma tech news — no spam.</p>
      <p><a href="${frontendUrl}/shop" style="display:inline-block;padding:10px 20px;background:#4CAF50;color:#fff;text-decoration:none;border-radius:5px;">Browse machines</a></p>
      ${unsubscribeUrl ? `<p style="color:#888;font-size:12px;margin-top:24px;">Don't want these emails? <a href="${unsubscribeUrl}" style="color:#888;">Unsubscribe</a> with one click.</p>` : ''}
    </div>
  `;

  emailQueue.add(() =>
    transporter.sendMail({
      from,
      to,
      subject: 'Subscription Confirmed ✅',
      html,
      ...(unsubscribeUrl ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` } } : {}),
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

// Escape customer-supplied text before putting it into HTML
const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

const inr = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const sendOrderConfirmationEmail = (order) => {
  const to = order?.customerInfo?.email || order?.email;
  if (!to) return false;

  const { customerInfo = {}, shippingAddress = {}, items = [] } = order;
  const paymentLabel = {
    cod: 'Cash on Delivery',
    card: 'Card',
    upi: 'UPI',
    wallet: 'Wallet',
  }[order.paymentMethod] || order.paymentMethod;

  const shopUrl = `${frontendUrl}/shop`;
  const productUrl = (item) =>
    item.productId ? `${shopUrl}/${encodeURIComponent(item.productId)}` : shopUrl;

  // One row per product: image | name (linked) + qty × price | line total.
  // Three narrow columns so it stays readable on a phone without scrolling.
  const rows = items.map((item) => {
    const url = productUrl(item);
    const image = /^https?:\/\//i.test(item.image || '')
      ? `<a href="${esc(url)}"><img src="${esc(item.image)}" alt="${esc(item.name)}" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid #eee;" /></a>`
      : '';
    return `
      <tr>
        <td width="72" style="padding:12px 8px 12px 0;border-bottom:1px solid #eee;vertical-align:top;">${image}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #eee;vertical-align:top;">
          <a href="${esc(url)}" style="color:#1a73e8;text-decoration:none;font-weight:bold;font-size:15px;">${esc(item.name)}</a>
          <div style="color:#777;font-size:13px;margin-top:4px;">Qty ${esc(item.quantity)} × ${inr(item.price)}</div>
          <a href="${esc(url)}" style="color:#4CAF50;font-size:13px;text-decoration:none;">View product →</a>
        </td>
        <td style="padding:12px 0 12px 8px;border-bottom:1px solid #eee;vertical-align:top;text-align:right;white-space:nowrap;font-weight:bold;">${inr(item.price * item.quantity)}</td>
      </tr>`;
  }).join('');

  const address = [
    shippingAddress.addressLine1,
    shippingAddress.addressLine2,
    [shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ')
      + (shippingAddress.pincode ? ` – ${shippingAddress.pincode}` : ''),
    shippingAddress.country,
  ].filter(Boolean).map(esc).join('<br/>');

  const delivery = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { dateStyle: 'medium' })
    : null;

  const button = (href, label, bg) =>
    `<a href="${href}" class="btn" style="display:inline-block;padding:12px 22px;margin:6px 4px;background:${bg};color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;">${label}</a>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmation</title>
  <style>
    @media only screen and (max-width: 480px) {
      .wrap { padding: 16px !important; }
      .title { font-size: 20px !important; }
      .btn { display: block !important; margin: 8px 0 !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
    <tr><td align="center" style="padding:16px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;">
        <tr><td class="wrap" style="padding:28px;font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.5;">
          <h2 class="title" style="color:#4CAF50;margin:0 0 8px;font-size:24px;">Thank you for your order, ${esc(customerInfo.firstName) || 'there'}!</h2>
          <p style="margin:0 0 16px;">We've received your order and it's now being processed.</p>
          <p style="margin:0 0 16px;background:#f8f8f8;padding:12px;border-radius:6px;">
            <strong>Order ID:</strong> ${esc(order.orderId)}<br/>
            <strong>Order date:</strong> ${new Date(order.orderDate || Date.now()).toLocaleString('en-IN')}<br/>
            <strong>Payment:</strong> ${esc(paymentLabel)} (${esc(order.paymentStatus)})
          </p>

          <h3 style="margin:20px 0 4px;font-size:16px;">Your products</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${rows}
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            <tr><td style="color:#777;">Subtotal</td><td align="right">${inr(order.subtotal)}</td></tr>
            <tr><td style="color:#777;">Shipping</td><td align="right">${inr(order.shippingCost)}</td></tr>
            ${order.discount ? `<tr><td style="color:#2e7d32;">Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ''}</td><td align="right" style="color:#2e7d32;">−${inr(order.discount)}</td></tr>` : ''}
            <tr><td style="padding-top:8px;font-size:16px;"><strong>Total</strong></td><td align="right" style="padding-top:8px;font-size:16px;"><strong>${inr(order.totalAmount)}</strong></td></tr>
          </table>

          <h3 style="margin:24px 0 4px;font-size:16px;">Shipping address</h3>
          <p style="margin:0;">${esc(`${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim())}<br/>${address}</p>
          ${delivery ? `<p style="margin:12px 0 0;"><strong>Estimated delivery:</strong> ${delivery}</p>` : ''}

          <div style="text-align:center;margin-top:24px;">
            ${button(trackUrl(order.orderId), 'Track your order', '#4CAF50')}
            ${button(shopUrl, 'Continue shopping', '#1a73e8')}
          </div>
          <p style="margin:24px 0 0;color:#777;font-size:13px;text-align:center;">Your invoice is attached as a PDF. We'll email you whenever your order status changes. Thanks for shopping with us!</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  emailQueue.add(async () => {
    // The invoice is built inside the queued task so checkout never waits for it
    let attachments = [];
    try {
      attachments = [{ filename: `Invoice-${order.orderId}.pdf`, content: await generateInvoicePdf(order), contentType: 'application/pdf' }];
    } catch (err) {
      console.error('Invoice PDF failed, sending email without it:', err.message);
    }
    return transporter.sendMail({
      from,
      to,
      subject: `Order Confirmation – #${order.orderId}`,
      html,
      attachments,
    });
  });
  return true;
};

const trackUrl = (orderId) => `${frontendUrl}/track-order?id=${encodeURIComponent(orderId)}`;

// One email per order status change
const STATUS_LABELS = {
  confirmed: 'Confirmed', processing: 'Processing', shipped: 'Dispatched',
  delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded',
};
const STATUS_EMAILS = {
  processing: {
    subject: (id) => `Your order #${id} is being processed`,
    heading: 'Your order is being prepared',
    text: "Good news! We've started processing your order. We'll email you again as soon as it's dispatched.",
    color: '#1a73e8',
  },
  shipped: {
    subject: (id) => `Your order #${id} has been dispatched 🚚`,
    heading: 'Your order is on its way!',
    text: 'Your order has been dispatched and is on its way to you.',
    color: '#4CAF50',
  },
  delivered: {
    subject: (id) => `Your order #${id} has been delivered`,
    heading: 'Your order has been delivered',
    text: 'Your order has been delivered. We hope you are happy with your purchase! If anything is not right, just reply to this email.',
    color: '#4CAF50',
  },
  cancelled: {
    subject: (id) => `Your order #${id} has been cancelled`,
    heading: 'Your order has been cancelled',
    text: 'Your order has been cancelled. If you paid online, any refund will be processed to your original payment method. Reply to this email if you have any questions.',
    color: '#e53935',
  },
  refunded: {
    subject: (id) => `Refund for order #${id}`,
    heading: 'Your refund has been processed',
    text: 'We have processed a refund for your order. It can take 5–7 working days to appear in your account.',
    color: '#1a73e8',
  },
  confirmed: {
    subject: (id) => `Your order #${id} is confirmed`,
    heading: 'Your order is confirmed',
    text: 'Your order is confirmed and will be processed shortly.',
    color: '#4CAF50',
  },
};

const sendOrderStatusEmail = (order) => {
  const to = order?.customerInfo?.email || order?.email;
  const tpl = STATUS_EMAILS[order?.orderStatus];
  if (!to || !tpl) return false;

  const name = esc(order.customerInfo?.firstName) || 'there';
  const items = (order.items || []).map((i) => `${esc(i.name)} × ${esc(i.quantity)}`).join('<br/>');
  const trackingBlock = order.orderStatus === 'shipped' && order.trackingUrl
    ? `<p style="margin:16px 0;text-align:center;"><a href="${esc(order.trackingUrl)}" style="display:inline-block;padding:12px 22px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Track your parcel</a></p>
       <p style="margin:0;color:#777;font-size:12px;text-align:center;word-break:break-all;">${esc(order.trackingUrl)}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${esc(tpl.heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
    <tr><td align="center" style="padding:16px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;">
        <tr><td style="padding:28px;font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.5;">
          <h2 style="color:${tpl.color};margin:0 0 8px;font-size:22px;">${esc(tpl.heading)}</h2>
          <p style="margin:0 0 16px;">Hi ${name},</p>
          <p style="margin:0 0 16px;">${esc(tpl.text)}</p>
          ${trackingBlock}
          <p style="margin:16px 0;background:#f8f8f8;padding:12px;border-radius:6px;">
            <strong>Order ID:</strong> ${esc(order.orderId)}<br/>
            <strong>Status:</strong> ${esc(STATUS_LABELS[order.orderStatus])}<br/>
            <strong>Total:</strong> ${inr(order.totalAmount)}
          </p>
          ${items ? `<p style="margin:0 0 16px;"><strong>Items</strong><br/>${items}</p>` : ''}
          <div style="text-align:center;margin-top:20px;">
            <a href="${trackUrl(order.orderId)}" style="display:inline-block;padding:12px 22px;background:#4CAF50;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View order status</a>
          </div>
          <p style="margin:24px 0 0;color:#777;font-size:13px;text-align:center;">Questions? Just reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  emailQueue.add(() => transporter.sendMail({ from, to, subject: tpl.subject(order.orderId), html }));
  return true;
};

// Bulk quote request: notify the business first, then confirm to the customer
// hooks: { onAdminSent, onCustomerSent, onError } — used to record delivery on the quote
const sendBulkQuoteEmails = (quote, hooks = {}) => {
  const c = quote.contact || {};
  const rows = (quote.items || []).map((i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${esc(i.name)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${esc(i.quantity)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${esc(i.notes)}</td>
      </tr>`).join('');
  const table = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:12px 0;">
      <tr style="background:#f5f5f5;"><th style="padding:8px;text-align:left;">Product</th><th style="padding:8px;">Qty</th><th style="padding:8px;text-align:left;">Notes</th></tr>
      ${rows}
    </table>`;
  const where = [quote.deliveryCity, quote.deliveryState, quote.country].filter(Boolean).map(esc).join(', ');
  const by = quote.requiredBy ? new Date(quote.requiredBy).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '';
  const wrap = (inner) => `<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:16px 8px;background:#f4f4f4;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;padding:24px;font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.5;">${inner}</div></body></html>`;

  const adminTo = process.env.QUOTE_TO || process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  const adminMail = {
    from,
    to: adminTo,
    replyTo: c.email,
    subject: `New bulk quote ${quote.quoteNumber} — ${quote.items.length} item(s)${c.company ? ` from ${c.company}` : ''}`,
    html: wrap(`
        <h2 style="margin-top:0;color:#e65100;">New bulk quote request</h2>
        <p><strong>${esc(quote.quoteNumber)}</strong></p>
        <p>
          <strong>Name:</strong> ${esc(c.name)}<br/>
          ${c.company ? `<strong>Company:</strong> ${esc(c.company)}<br/>` : ''}
          <strong>Email:</strong> <a href="mailto:${esc(c.email)}">${esc(c.email)}</a><br/>
          <strong>Phone:</strong> <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a><br/>
          ${c.gstin ? `<strong>GSTIN:</strong> ${esc(c.gstin)}<br/>` : ''}
          ${where ? `<strong>Deliver to:</strong> ${where}<br/>` : ''}
          ${by ? `<strong>Needed by:</strong> ${by}<br/>` : ''}
        </p>
        ${table}
        ${quote.message ? `<p style="white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:6px;">${esc(quote.message)}</p>` : ''}
        <p><a href="${frontendUrl}/dashboard/bulk-quotes" style="display:inline-block;padding:10px 18px;background:#e65100;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Open in dashboard</a></p>`),
  };
  // Plain-text twin of the item list (emails with a text part are less likely to land in spam)
  const itemsText = (quote.items || []).map((i) => `- ${i.name} x ${i.quantity}${i.notes ? ` (${i.notes})` : ''}`).join('\n');
  const supportPhone = process.env.SUPPORT_PHONE || '+91 87007 92607';
  const supportEmail = process.env.SMTP_USER || '';
  const customerMail = {
    from,
    to: c.email,
    replyTo: adminTo || supportEmail,
    subject: `Thank you for your enquiry ${quote.quoteNumber} - we will contact you soon`,
    text: [
      `Dear ${c.name},`,
      '',
      `Thank you for contacting Food Pharma Machinery. We have received your bulk quote request ${quote.quoteNumber}.`,
      '',
      'Our team will connect with you soon (usually within 1 business day) by phone or email with pricing and availability.',
      '',
      'Your request:',
      itemsText,
      '',
      `Need to add something? Reply to this email or call us on ${supportPhone}.`,
      '',
      'Regards,',
      'Team Food Pharma Machinery',
      frontendUrl,
    ].join('\n'),
    html: wrap(`
      <h2 style="margin-top:0;color:#2e7d32;">Thank you for contacting us, ${esc(c.name)}!</h2>
      <p>We have received your bulk quote request <strong>${esc(quote.quoteNumber)}</strong>.</p>
      <p style="background:#e8f5e9;border-left:4px solid #2e7d32;padding:12px;border-radius:4px;">
        <strong>Our team will connect with you soon</strong> — usually within 1 business day — by phone or email with pricing and availability.
      </p>
      <p style="margin-bottom:4px;"><strong>Your request</strong></p>
      ${table}
      <p>Need to add something? Simply reply to this email or call us on <a href="tel:${esc(supportPhone.replace(/\s/g, ''))}">${esc(supportPhone)}</a>.</p>
      <p>Regards,<br/><strong>Team Food Pharma Machinery</strong><br/><a href="${frontendUrl}">${frontendUrl.replace(/^https?:\/\//, '')}</a></p>`),
  };

  // One ordered task: the customer is only told "we received it" once the
  // business email has really been sent (tried up to 3 times).
  emailQueue.add(async () => {
    if (!adminTo) {
      hooks.onError?.('No business email address is set (QUOTE_TO / SMTP_USER)');
      return;
    }
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const adminInfo = await transporter.sendMail(adminMail);
        console.log(`Bulk quote ${quote.quoteNumber}: business email accepted (${adminInfo.messageId})`);
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 5000));
      }
    }
    if (lastError) {
      hooks.onError?.(`Business email failed: ${lastError.message}`);
      throw lastError;
    }
    await hooks.onAdminSent?.();

    try {
      const info = await transporter.sendMail(customerMail);
      console.log(`Bulk quote ${quote.quoteNumber}: customer confirmation accepted for ${c.email} (${info.messageId})`);
      await hooks.onCustomerSent?.(info.messageId);
    } catch (err) {
      hooks.onError?.(`Customer confirmation failed: ${err.message}`);
      throw err;
    }
  });
  return true;
};

module.exports = {
  sendBulkQuoteEmails,
  sendResetEmail,
  sendWelcomeEmail,
  sendSubscriptionEmail,
  sendContactEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
};