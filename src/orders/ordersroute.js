const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("./ordersmodel");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// ─── Email transporter ──────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
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

// GET /api/orders – all orders (admin — ⚠️ currently unprotected)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ message: "Failed to fetch all orders" });
  }
});

// GET /api/orders/my-orders – requires login, matches by userId, resolves email from DB
 // already used globally in your server.js

// ✅ Reads the JWT from the httpOnly cookie set at login, not a header
router.get("/my-orders", (req, res, next) => {
  const token = req.cookies?.token; // ⚠️ confirm the cookie name — see below

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    let email = null;
    try {
      const User = require("../users/usermodel"); // ⚠️ confirm path
      const userDoc = await User.findById(userId).select("email");
      email = userDoc?.email?.trim().toLowerCase() || null;
    } catch (e) {
      console.error("Could not resolve user email:", e.message);
    }

    const orConditions = [{ userId }];
    if (email) orConditions.push({ email }, { "customerInfo.email": email });

    const orders = await Order.find({ $or: orConditions }).sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching my orders:", error);
    res.status(500).json({ message: "Failed to fetch your orders" });
  }
});

// GET /api/orders/order/:id – single order
router.get("/order/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order by id:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

// GET /api/orders/:email – orders by email (backward compat)
router.get("/:email", async (req, res) => {
  const email = req.params.email?.trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "Email is required" });
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

// PATCH /api/orders/update-order-status/:id – update status
// PATCH /api/orders/update-order-status/:id – update order status (admin)
router.patch("/update-order-status/:id", async (req, res) => {
  const { id } = req.params;
  const { status, orderStatus, paymentStatus } = req.body;

  if (!status && !orderStatus && !paymentStatus) {
    return res.status(400).json({ message: "At least one status field is required" });
  }

  try {
    const update = { updatedAt: new Date() };
    // If status is sent, update both orderStatus and status (for consistency)
    if (status) {
      update.orderStatus = status;
      update.status = status;   // keep legacy field in sync
    }
    if (orderStatus) {
      update.orderStatus = orderStatus;
      update.status = orderStatus;
    }
    if (paymentStatus) {
      update.paymentStatus = paymentStatus;
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
});
// DELETE /api/orders/delete-order/:id – delete order
router.delete("/delete-order/:id", async (req, res) => {
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

// ─── SEND CONFIRMATION EMAIL ──────────────────────────────
router.post("/send-order-confirmation", async (req, res) => {
  const { orderData, userEmail } = req.body;
  if (!orderData || !userEmail) {
    return res.status(400).json({ error: "Missing order data or email" });
  }
  try {
    const itemsList = orderData.items
      .map(item => `${item.name} × ${item.quantity} – ₹${item.price * item.quantity}`)
      .join('\n');

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@yourapp.com',
      to: userEmail,
      subject: `Order Confirmation – #${orderData.orderId}`,
      text: `
        Thank you for your order!

        Order ID: ${orderData.orderId}
        Date: ${new Date(orderData.orderDate).toLocaleString()}
        Total: ₹${orderData.totalAmount}

        Items:
        ${itemsList}

        Shipping Address:
        ${orderData.shippingAddress.addressLine1}
        ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} – ${orderData.shippingAddress.pincode}
        ${orderData.shippingAddress.country}

        Estimated delivery: ${new Date(orderData.estimatedDelivery).toLocaleDateString()}

        We'll notify you when your order ships.
        Thanks for shopping with us!
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Confirmation email sent" });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

module.exports = router;