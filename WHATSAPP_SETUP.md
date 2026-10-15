# WhatsApp invoice & dispatch messages — setup

The backend sends two WhatsApp messages through Meta's **WhatsApp Cloud API**:

| When | Message | Code |
|---|---|---|
| Customer places an order | PDF invoice | `POST /api/orders` → `sendInvoiceWhatsApp` |
| Admin sets status to **Shipped** with a tracking link | Dispatch + tracking link (sent once) | `PATCH /api/orders/update-order-status/:id` → `sendDispatchWhatsApp` |

Until the `.env` values below are set, nothing is sent and orders work as normal.

## 1. Create the WhatsApp Business account

1. Go to <https://developers.facebook.com> → **My Apps → Create app** → type **Business**.
2. Add the **WhatsApp** product. This creates a WhatsApp Business account with a free test number.
3. **WhatsApp → API Setup → Add phone number**: add your business number.
   The number must **not** be logged in on the normal WhatsApp / WhatsApp Business app.
4. Copy the **Phone number ID** (not the phone number itself).

## 2. Permanent access token

1. <https://business.facebook.com> → **Settings → Users → System users → Add** (role: Admin).
2. **Assign assets** → your app (full control) and your WhatsApp account (full control).
3. **Generate new token** → choose the app → permissions `whatsapp_business_messaging` and
   `whatsapp_business_management` → expiry **Never**. Copy the token.

## 3. Create the two message templates

WhatsApp Manager → **Message templates → Create template**. Category **Utility**, language **English (en)**.
Names and variable order must match exactly.

**`order_invoice`**
- Header: **Document**
- Body:
  ```
  Hi {{1}}, thank you for your order {{2}}.
  Total: {{3}}
  Your invoice is attached. We'll message you again when your order is dispatched.
  ```
  Sample values: `Asha`, `ORD-1760000000000-123`, `₹2,20,099`

**`order_dispatched`**
- Body:
  ```
  Hi {{1}}, good news! Your order {{2}} has been dispatched.
  Track your parcel here: {{3}}
  ```
  Sample values: `Asha`, `ORD-1760000000000-123`, `https://www.delhivery.com/track/package/1234567890`

Approval usually takes from a few minutes to a day.

## 4. Add to the backend `.env` (local and VPS) and restart

```
WHATSAPP_TOKEN=<system user token>
WHATSAPP_PHONE_NUMBER_ID=<phone number ID>
WHATSAPP_INVOICE_TEMPLATE=order_invoice
WHATSAPP_DISPATCH_TEMPLATE=order_dispatched
WHATSAPP_TEMPLATE_LANG=en

# Shown on the PDF invoice (optional)
SELLER_NAME=Food Pharma Machinery
SELLER_ADDRESS=
SELLER_PHONE=
SELLER_EMAIL=
SELLER_GSTIN=
```

On the VPS: `pm2 restart safescan-backend --update-env`

## Notes

- Customer phone numbers are taken from checkout. 10-digit Indian numbers get `91` added automatically.
- If sending fails, the reason is saved on the order (`whatsapp.lastError`) and logged; the order itself is never affected.
- The admin "Update Order Status" screen shows whether the dispatch message was sent and why not.
- Meta charges per conversation (Utility category); check current India pricing in WhatsApp Manager.
