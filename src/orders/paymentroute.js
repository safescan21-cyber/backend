// routes/paymentRoute.js
const express = require("express");
const router  = express.Router();
const Stripe  = require("stripe");
const Order   = require("../orders/ordersmodel"); // adjust path if needed

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ─────────────────────────────────────────────────────────────
// POST /api/payment/create-payment-intent
// ─────────────────────────────────────────────────────────────
// Called by the frontend as soon as the user selects Card/UPI.
// Returns a clientSecret which Stripe Elements uses to render
// the payment form and confirm the charge — card details never
// touch your server.
// ─────────────────────────────────────────────────────────────
router.post("/create-payment-intent", async (req, res) => {
  try {
    const {
      amount,
      currency = "inr",
      orderId  = "",
      customerEmail = "",
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "A valid amount is required" });
    }

    // Stripe requires the amount in the smallest currency unit:
    // INR → paise  (₹500 = 50000 paise)
    // USD → cents  ($5.00 = 500 cents)
    const amountInSmallestUnit = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   amountInSmallestUnit,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId,        // stored on Stripe so the webhook can find the order
        customerEmail,
      },
    });

    res.status(200).json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({
      message: "Failed to create payment intent",
      error:   error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/payment/verify/:paymentIntentId
// ─────────────────────────────────────────────────────────────
// Optional manual check — useful after a UPI/redirect flow where
// the page reloads and you need to re-confirm the payment status
// before showing a success screen.
// ─────────────────────────────────────────────────────────────
router.get("/verify/:paymentIntentId", async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
      return res.status(400).json({ message: "Invalid payment intent ID" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Map Stripe statuses to plain English for the frontend
    const statusMap = {
      succeeded:                "paid",
      processing:               "processing",
      requires_payment_method:  "failed",
      requires_confirmation:    "pending",
      requires_action:          "pending",
      canceled:                 "cancelled",
    };

    res.status(200).json({
      stripeStatus: paymentIntent.status,
      status:       statusMap[paymentIntent.status] || "unknown",
      amount:       paymentIntent.amount / 100,   // back to rupees/dollars
      currency:     paymentIntent.currency,
      orderId:      paymentIntent.metadata?.orderId || null,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Failed to verify payment" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payment/webhook
// ─────────────────────────────────────────────────────────────
// Stripe calls this endpoint from THEIR servers after every
// payment event. This is the SOURCE OF TRUTH — it fires even if
// the user's browser tab closes mid-checkout.
//
// IMPORTANT: express.raw() is applied here (not express.json())
// because Stripe's signature verification needs the raw Buffer.
// In server.js, mount /api/payment BEFORE app.use(express.json()).
// ─────────────────────────────────────────────────────────────
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      return res.status(400).json({ message: "Missing stripe-signature header" });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ── Handle events ──────────────────────────────────────────
    try {
      switch (event.type) {

        // ── Payment succeeded ──────────────────────────────────
        case "payment_intent.succeeded": {
          const pi = event.data.object;
          console.log(`Payment succeeded: ${pi.id}  orderId: ${pi.metadata?.orderId}`);

          if (pi.metadata?.orderId) {
            await Order.findOneAndUpdate(
              { orderId: pi.metadata.orderId },
              {
                paymentStatus:   "paid",
                orderStatus:     "confirmed",
                paymentIntentId: pi.id,
              }
            );
          }
          break;
        }

        // ── Payment failed ─────────────────────────────────────
        case "payment_intent.payment_failed": {
          const pi = event.data.object;
          const reason = pi.last_payment_error?.message || "Unknown reason";
          console.log(`Payment failed: ${pi.id}  reason: ${reason}`);

          if (pi.metadata?.orderId) {
            await Order.findOneAndUpdate(
              { orderId: pi.metadata.orderId },
              {
                paymentStatus: "failed",
                orderStatus:   "payment_failed",
              }
            );
          }
          break;
        }

        // ── Payment requires further action (3D Secure etc.) ───
        case "payment_intent.requires_action": {
          const pi = event.data.object;
          console.log(`Payment requires action: ${pi.id}`);

          if (pi.metadata?.orderId) {
            await Order.findOneAndUpdate(
              { orderId: pi.metadata.orderId },
              { paymentStatus: "pending" }
            );
          }
          break;
        }

        // ── Charge refunded ────────────────────────────────────
        case "charge.refunded": {
          const charge = event.data.object;
          console.log(`Charge refunded: ${charge.id}`);

          // Retrieve the linked PaymentIntent to get the orderId
          if (charge.payment_intent) {
            const pi = await stripe.paymentIntents.retrieve(charge.payment_intent);
            if (pi.metadata?.orderId) {
              await Order.findOneAndUpdate(
                { orderId: pi.metadata.orderId },
                {
                  paymentStatus: "refunded",
                  orderStatus:   "refunded",
                }
              );
            }
          }
          break;
        }

        // ── Charge dispute created (chargeback) ────────────────
        case "charge.dispute.created": {
          const dispute = event.data.object;
          console.warn(`Dispute raised for charge: ${dispute.charge}`);
          // Log for manual review — disputes need human intervention
          break;
        }

        default:
          // Silently ignore unhandled events (Stripe sends many)
          break;
      }
    } catch (dbError) {
      // Log DB errors but still return 200 to Stripe — otherwise
      // Stripe will keep retrying the same event for up to 3 days.
      console.error("DB update failed inside webhook handler:", dbError);
    }

    // Always respond 200 so Stripe marks the event as delivered
    res.status(200).json({ received: true });
  }
);

module.exports = router;