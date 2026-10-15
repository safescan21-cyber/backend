// WhatsApp messages through Meta's WhatsApp Cloud API.
//
// .env:
//   WHATSAPP_TOKEN=             permanent access token (System User token)
//   WHATSAPP_PHONE_NUMBER_ID=   "Phone number ID" from WhatsApp Manager → API Setup
//   WHATSAPP_INVOICE_TEMPLATE=  approved template name   (default: order_invoice)
//   WHATSAPP_DISPATCH_TEMPLATE= approved template name   (default: order_dispatched)
//   WHATSAPP_TEMPLATE_LANG=     template language code   (default: en)
//
// Messages a business starts must use templates approved by Meta.
// If WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID are missing, nothing is sent.
const { generateInvoicePdf } = require("../orders/invoice");

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

const isConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

// "98765 43210", "+91-9876543210", "09876543210" → "919876543210"
const toWhatsAppNumber = (phone) => {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
};

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const graphRequest = async (path, options) => {
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error;
    throw new Error(`WhatsApp API ${res.status}: ${err?.message || "unknown error"}${err?.error_data?.details ? ` (${err.error_data.details})` : ""}`);
  }
  return data;
};

const uploadPdf = async (buffer, filename) => {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([buffer], { type: "application/pdf" }), filename);
  const data = await graphRequest("media", { method: "POST", body: form });
  return data.id;
};

const sendTemplate = (to, name, components) =>
  graphRequest("messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name, language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" }, components },
    }),
  });

const textParams = (...values) =>
  values.map((v) => ({ type: "text", text: String(v ?? "").replace(/\s+/g, " ").trim() || "-" }));

// Template "order_invoice": document header + body
//   "Hi {{1}}, thank you for your order {{2}}. Total: {{3}}. Your invoice is attached…"
const sendInvoiceWhatsApp = async (order) => {
  if (!isConfigured()) return { skipped: "WhatsApp not configured" };
  const to = toWhatsAppNumber(order?.customerInfo?.phone);
  if (!to) return { skipped: "no valid customer phone" };

  const filename = `Invoice-${order.orderId}.pdf`;
  const mediaId = await uploadPdf(await generateInvoicePdf(order), filename);

  return sendTemplate(to, process.env.WHATSAPP_INVOICE_TEMPLATE || "order_invoice", [
    { type: "header", parameters: [{ type: "document", document: { id: mediaId, filename } }] },
    { type: "body", parameters: textParams(order.customerInfo?.firstName || "there", order.orderId, money(order.totalAmount)) },
  ]);
};

// Template "order_dispatched": body
//   "Hi {{1}}, your order {{2}} has been dispatched. Track your parcel here: {{3}}"
const sendDispatchWhatsApp = async (order) => {
  if (!isConfigured()) return { skipped: "WhatsApp not configured" };
  const to = toWhatsAppNumber(order?.customerInfo?.phone);
  if (!to) return { skipped: "no valid customer phone" };

  return sendTemplate(to, process.env.WHATSAPP_DISPATCH_TEMPLATE || "order_dispatched", [
    { type: "body", parameters: textParams(order.customerInfo?.firstName || "there", order.orderId, order.trackingUrl) },
  ]);
};

module.exports = { sendInvoiceWhatsApp, sendDispatchWhatsApp, toWhatsAppNumber, isConfigured };
