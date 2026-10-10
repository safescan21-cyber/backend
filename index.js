require("dotenv").config();

// ── Optional DNS override (fixes ENOTFOUND for Atlas on some networks/VPS) ──
if (process.env.CUSTOM_DNS === "true") {
  const dns = require("node:dns");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const connectToMongoDB = require("./config/db");
const productsRoute = require("./src/products/productsRoute");
const userRoutes = require("./src/users/userroute");
const reviewRoutes = require("./src/review/reviewrouter");
const orderRoutes = require("./src/orders/ordersroute");
const statsRoutes = require("./src/stats/statsRoute");
const uploadImage = require("./src/utils/uploadImage");
const jobsRoutes = require("./src/jobs/jobsRoute");
const visitTracker = require("./src/middlewere/visitTracker");
const adminAnalytics = require("./src/visitor/analytics");
const heroRoutes = require("./src/Hero/heroRoutes");
const pressRoutes = require("./src/press/pressRoutes");
const newsletterRoutes = require("./src/news/newsletterRoutes");
const contactRoutes = require("./src/contact/contactRoutes");
const uploadRoute = require('./src/utils/uploadroute');

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";
const isProd = process.env.NODE_ENV === "production";

// ── Behind Nginx: trust the proxy so req.ip, secure cookies, and
//    visitTracker see the real client IP / protocol ─────────────────────
app.set("trust proxy", 1);

// ── Allowed frontend origins ────────────────────────────────────────────
// Add extra ones in .env: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://frontend-wzvf-git-main-safescan21-cyber.vercel.app",
  "https://frontend-safescan21-cyber.vercel.app",
];

const envOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, health checks, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ── Core middleware ─────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // this is an API, not serving HTML
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false, // set manually below
  })
);
app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

app.use(cookieParser());
app.use(visitTracker);

// ── Health check (for Nginx / PM2 / uptime monitors) ────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    mongo: mongoose.connection.readyState === 1 ? "connected" : "not connected",
  });
});

// ── Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", userRoutes);
app.use("/api/products", productsRoute);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/admin", adminAnalytics);
app.use("/api/hero-slides", heroRoutes);
app.use("/api/press", pressRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api", contactRoutes);
app.use("/api/upload", uploadRoute);


app.get("/", (req, res) => {
  return res.send("hello world");
});

// ── Cloudinary ──────────────────────────────────────────────────────────
// Cloudinary is configured from env vars (see below).
// Supports either CLOUDINARY_URL or the three separate variables
// (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET),
// which ./src/utils/uploadImage.js uses to configure the SDK.


// ── HTTP server + Socket.IO (for live online-user tracking) ────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Tracks every open socket connection (tabs/sessions), not unique accounts.
const onlineSockets = new Set();

io.on("connection", (socket) => {
  onlineSockets.add(socket.id);
  io.emit("online-count", onlineSockets.size);
  console.log(`🟢 Client connected (${onlineSockets.size} online)`);

  socket.on("disconnect", () => {
    onlineSockets.delete(socket.id);
    io.emit("online-count", onlineSockets.size);
    console.log(`🔴 Client disconnected (${onlineSockets.size} online)`);
  });
});

app.get("/api/online-count", (req, res) => {
  res.json({ count: onlineSockets.size });
});

// ── 404 handler ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Error handling middleware (must be last) ────────────────────────────
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  if (res.headersSent) return next(err);

  const status = err.status || (err.message?.startsWith("CORS blocked") ? 403 : 500);
  return res.status(status).json({
    success: false,
    message:
      isProd && status === 500
        ? "Internal server error"
        : err.message || "Internal server error",
  });
});

// ── MongoDB connection event listeners (registered before connecting) ──
mongoose.connection.on("connected", () => {
  console.log("📡 MongoDB connection established");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
});

// ── Handle listen errors (e.g. EADDRINUSE) with a clear message ────────
httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${port} is already in use. Stop the other process ` +
        `(pm2 delete all / kill the PID from: ss -ltnp | grep :${port}) or change PORT in .env`
    );
  } else {
    console.error("❌ HTTP server error:", err.message);
  }
  process.exit(1);
});

// ── Start server ────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectToMongoDB();

    httpServer.listen(port, host, () => {
      console.log(
        `🚀 Server running on ${host}:${port} (${process.env.NODE_ENV || "development"})`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

// ── Graceful shutdown (PM2 sends SIGINT/SIGTERM on restart/stop) ───────
const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down...`);
  httpServer.close(async () => {
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
    } finally {
      process.exit(0);
    }
  });
  // Force exit if connections hang
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});