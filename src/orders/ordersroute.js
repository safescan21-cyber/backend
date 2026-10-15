const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("./ordersmodel");
const jwt = require("jsonwebtoken");
const { sendOrderConfirmationEmail } = require("../users/email");
const { verifyToken, verifyAdmin } = require("../middlewere/authMiddleware");
const User = require("../users/Usermodel");

// Email of the logged-in user (cached on the request)
const getRequestUserEmail = async (req) => {
  if (req._userEmail !== undefined) return req._userEmail;
  let email = null;
  try {
    const userDoc = await User.findById(req.userId).select("email").lean();
    email = userDoc?.email?.trim().toLowerCase() || null;
  } catch (e) {
    console.error("Could not resolve user email:", e.message);
  }
  req._userEmail = email;
  return email;
};

// Admins see every order; customers only their own (by account or email)
const canSeeOrder = async (req, order) => {
  if (req.role === "admin") return true;
  if (order.userId && String(order.userId) === String(req.userId)) return true;
  const email = await getRequestUserEmail(req);
  return Boolean(email) && [order.email, order.customerInfo?.email].some((e) => e?.toLowerCase() === email);
};
const { sendInvoiceWhatsApp, sendDispatchWhatsApp } = require("../utils/whatsapp");

// Records the WhatsApp result on the order; never throws.
const recordWhatsApp = (orderId, sentField, promise) =>
  promise
    .then((result) => {
      if (result?.skipped) return console.log(`WhatsApp ${sentField} skipped for ${orderId}: ${result.skipped}`);
      return Order.updateOne({ _id: orderId }, { [`whatsapp.${sentField}`]: new Date(), "whatsapp.lastError": "" });
    })
    .catch((err) => {
      console.error(`WhatsApp ${sentField} failed for ${orderId}:`, err.message);
      return Order.updateOne({ _id: orderId }, { "whatsapp.lastError": err.message }).catch(() => {});
    });

// ── Optional auth: decodes the token directly if present, but NEVER
// blocks the request or sends a response on failure. This is what
// fixes "No token provided" / "Invalid token" errors on checkout —
// those messages come from a STRICT verifyToken middleware, which
// this route intentionally does not use.
const attachUserIfPresent = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // ⚠️ confirm env var name
      req.user = decoded; // { id, role, iat, exp }
    }
  } catch (err) {
    console.log("attachUserIfPresent: no valid token, proceeding as guest —", err.message);
  }
  next(); // ✅ ALWAYS proceeds, regardless of token validity
};

// ─── STRIPE: Create checkout session ──────────────────────
router.post("/create-checkout-session", async (req, res) => {
  const { products } = req.body;
  if (!products || products.length === 0) {
    return res.status(400).json({ error: "No products provided" });
  }
  try {
    const lineItems = products.map((product) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: product.name,
          images: product.image ? [product.image] : [],
        },
        unit_amount: Math.round(product.price * 100),
      },
      quantity: product.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });
    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ─── STRIPE: Confirm payment ──────────────────────────────
router.post("/confirm-payment", attachUserIfPresent, async (req, res) => {
  const { session_id } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: "session_id is required" });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items", "payment_intent"],
    });
    const paymentIntentId = session.payment_intent.id;
    const succeeded = session.payment_intent.status === "succeeded";
    const email = session.customer_details.email?.trim().toLowerCase() || "";

    let order = await Order.findOne({ orderId: paymentIntentId });
    if (!order) {
      const lineItems = session.line_items.data.map((item) => ({
        productId: item.price.product,
        quantity: item.quantity,
      }));
      order = new Order({
        orderId: paymentIntentId,
        userId: req.user?.id || req.user?._id || null,
        items: lineItems,
        email,
        paymentMethod: "card",
        paymentStatus: succeeded ? "paid" : "failed",
        paymentIntentId,
        orderStatus: succeeded ? "confirmed" : "payment_failed",
        customerInfo: {
          firstName: session.customer_details.name || "Guest",
          lastName: "",
          email,
          phone: "",
        },
        shippingAddress: {
          addressLine1: "",
          city: "",
          state: "",
          pincode: "",
        },
        subtotal: session.amount_total / 100,
        totalAmount: session.amount_total / 100,
      });
    } else {
      order.paymentStatus = succeeded ? "paid" : "failed";
      order.orderStatus = succeeded ? "confirmed" : "payment_failed";
    }
    await order.save();
    res.status(200).json({ order });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

// ─── ORDER CRUD ────────────────────────────────────────────

// POST /api/orders – place a new order (COD or embedded Stripe)
router.post("/", attachUserIfPresent, async (req, res) => {
  try {
    const {
      orderId,
      customerInfo,
      shippingAddress,
      items,
      paymentMethod,
      paymentStatus,
      paymentIntentId,
      orderStatus,
      subtotal,
      shippingCost,
      discount,
      totalAmount,
      orderDate,
      estimatedDelivery,
      email: topLevelEmail,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }
    if (!customerInfo || !customerInfo.email) {
      return res.status(400).json({ message: "customerInfo with email is required" });
    }
    if (!shippingAddress || !shippingAddress.addressLine1) {
      return res.status(400).json({ message: "shippingAddress is required" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item" });
    }

    const existing = await Order.findOne({ orderId });
    if (existing) {
      return res.status(200).json({
        message: "Order already exists",
        orderId: existing.orderId,
      });
    }

    const email = (topLevelEmail || customerInfo.email || "").trim().toLowerCase();

    const order = new Order({
      orderId,
      userId: req.user?.id || req.user?._id || null,
      email,
      customerInfo: { ...customerInfo, email },
      shippingAddress,
      items,
      paymentMethod: paymentMethod || "cod",
      paymentStatus: paymentStatus || "pending",
      paymentIntentId: paymentIntentId || null,
      orderStatus: orderStatus || "confirmed",
      subtotal: subtotal || totalAmount,
      shippingCost: shippingCost || 0,
      discount: discount || 0,
      totalAmount,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
    });

    await order.save();

    // Queue the confirmation email — never blocks or fails the order
    try {
      sendOrderConfirmationEmail(order);
    } catch (mailError) {
      console.error("Failed to queue order confirmation email:", mailError);
    }

    // Send the PDF invoice on WhatsApp in the background
    recordWhatsApp(order._id, "invoiceSentAt", sendInvoiceWhatsApp(order));

    res.status(201).json({
      message: "Order placed successfully",
      orderId: order.orderId,
      _id: order._id,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({
      message: "Failed to place order",
      error: error.message,
    });
  }
});

// GET /api/orders – all orders (admin only)
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ message: "Failed to fetch all orders" });
  }
});

// GET /api/orders/my-orders – the logged-in user's orders (by account or email)
router.get("/my-orders", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const email = await getRequestUserEmail(req);

    const orConditions = [{ userId }];
    if (email) orConditions.push({ email }, { "customerInfo.email": email });

    const orders = await Order.find({ $or: orConditions }).sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching my orders:", error);
    res.status(500).json({ message: "Failed to fetch your orders" });
  }
});

// GET /api/orders/track/:orderId – public order tracking by order ID.
// Returns progress only — never the customer's name, address, phone or email.
router.get("/track/:orderId", async (req, res) => {
  const orderId = String(req.params.orderId || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{4,60}$/.test(orderId)) {
    return res.status(400).json({ message: "Please enter a valid order ID" });
  }
  try {
    const order = await Order.findOne({ orderId })
      .select("orderId orderStatus paymentMethod paymentStatus items.name items.quantity items.image totalAmount orderDate createdAt dispatchedAt estimatedDelivery trackingUrl updatedAt")
      .lean();
    if (!order) return res.status(404).json({ message: "No order found with this ID" });

    res.set("Cache-Control", "no-store");
    res.status(200).json({
      orderId: order.orderId,
      status: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      items: order.items || [],
      totalAmount: order.totalAmount,
      orderDate: order.orderDate || order.createdAt,
      dispatchedAt: order.dispatchedAt || null,
      estimatedDelivery: order.estimatedDelivery || null,
      trackingUrl: order.trackingUrl || "",
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error("Error tracking order:", error);
    res.status(500).json({ message: "Could not look up the order. Please try again." });
  }
});

// GET /api/orders/order/:id – single order
router.get("/order/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).catch(() => null);
    // Same answer for "missing" and "not yours", so order IDs can't be probed
    if (!order || !(await canSeeOrder(req, order))) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order by id:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

// GET /api/orders/:email – orders by email (backward compat)
router.get("/:email", verifyToken, async (req, res) => {
  const email = req.params.email?.trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "Email is required" });
  if (req.role !== "admin" && email !== (await getRequestUserEmail(req))) {
    return res.status(403).json({ message: "You can only view your own orders" });
  }
  try {
    const orders = await Order.find({
      $or: [{ email }, { "customerInfo.email": email }],
    }).sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching orders by email:", error);
    res.status(500).json({ message: "Failed to fetch orders by email" });
  }
});

// PATCH /api/orders/update-order-status/:id – update order status (admin)
// When the status becomes "shipped" with a tracking link, the customer gets a
// WhatsApp dispatch message (only once per order).
router.patch("/update-order-status/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, orderStatus, paymentStatus } = req.body;
  const trackingUrl = typeof req.body.trackingUrl === "string" ? req.body.trackingUrl.trim() : undefined;

  if (!status && !orderStatus && !paymentStatus && trackingUrl === undefined) {
    return res.status(400).json({ message: "At least one status field is required" });
  }
  if (trackingUrl && !/^https?:\/\/\S+$/i.test(trackingUrl)) {
    return res.status(400).json({ message: "Tracking link must start with http:// or https://" });
  }

  try {
    const update = { updatedAt: new Date() };
    const newStatus = orderStatus || status;
    if (newStatus) {
      update.orderStatus = newStatus;
      update.status = newStatus; // keep legacy field in sync
      if (newStatus === "shipped") update.dispatchedAt = new Date();
    }
    if (paymentStatus) update.paymentStatus = paymentStatus;
    if (trackingUrl !== undefined) update.trackingUrl = trackingUrl;

    const updatedOrder = await Order.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Dispatch message on WhatsApp
    let whatsapp = null;
    if (updatedOrder.orderStatus === "shipped" && !updatedOrder.whatsapp?.dispatchSentAt) {
      if (!updatedOrder.trackingUrl) {
        whatsapp = { sent: false, reason: "Add a tracking link to send the dispatch WhatsApp" };
      } else {
        try {
          const result = await sendDispatchWhatsApp(updatedOrder);
          if (result?.skipped) {
            whatsapp = { sent: false, reason: result.skipped };
          } else {
            updatedOrder.whatsapp.dispatchSentAt = new Date();
            updatedOrder.whatsapp.lastError = "";
            await updatedOrder.save();
            whatsapp = { sent: true };
          }
        } catch (err) {
          console.error(`WhatsApp dispatch failed for ${updatedOrder.orderId}:`, err.message);
          updatedOrder.whatsapp.lastError = err.message;
          await updatedOrder.save().catch(() => {});
          whatsapp = { sent: false, reason: err.message };
        }
      }
    }

    res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder,
      whatsapp,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: error.name === "ValidationError" ? error.message : "Failed to update order status" });
  }
});

// DELETE /api/orders/delete-order/:id – delete order
router.delete("/delete-order/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({
      message: "Order deleted successfully",
      order: deletedOrder,
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

module.exports = router;