require("dotenv").config();
const express = require("express");
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const port = process.env.PORT || 3000;
const connectToMongoDB = require("./config/db");
const cookieParser = require('cookie-parser');
const productsRoute = require('./src/products/productsRoute')
const userRoutes = require('./src/users/userroute');
const reviewRoutes = require("./src/review/reviewrouter")
const orderRoutes = require("./src/orders/ordersroute")
const statsRoutes = require('./src/stats/statsRoute')
const uploadImage = require("./src/utils/uploadImage")
const helmet = require('helmet');
const jobsRoutes = require('./src/jobs/jobsRoute');
const visitTracker = require('./src/middlewere/visitTracker');
const adminAnalytics = require('./src/visitor/analytics'); 
const heroRoutes = require('./src/Hero/heroRoutes');
const pressRoutes = require('./src/press/pressRoutes');
const newsletterRoutes = require('./src/news/newsletterRoutes');
const contactRoutes = require('./src/contact/contactRoutes');

// ── Allowed frontend origins ────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://frontend-wzvf-git-main-safescan21-cyber.vercel.app",
  "https://frontend-safescan21-cyber.vercel.app",
];

// ── Core middleware (each parser registered exactly once) ──────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});



app.use(cookieParser());
app.use(visitTracker);

// ── Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', userRoutes);
app.use('/api/products', productsRoute)
app.use('/api/reviews', reviewRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/jobs', jobsRoutes);
app.use('/api/admin', adminAnalytics);
app.use('/api/hero-slides', heroRoutes);
app.use('/api/press', pressRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api', contactRoutes);



app.get('/', (req, res) => {
    return res.send("hello world");
});

// Cloudinary reads CLOUDINARY_URL from env automatically when the module loads —
// no explicit cloudinary.config({...}) call needed.
if (!process.env.CLOUDINARY_URL) {
  console.warn('⚠️ CLOUDINARY_URL not set — image uploads will fail');
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// ---------- Cloudinary upload helper (from buffer) ----------
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'products',
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result || !result.secure_url) {
          return reject(new Error('Cloudinary upload failed: no URL returned'));
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

// ---------- Route: upload multiple images ----------
const MAX_IMAGES = 5;

app.post('/uploadImages', upload.array('images', MAX_IMAGES), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images provided' });
    }

    if (files.length > MAX_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `You can upload a maximum of ${MAX_IMAGES} images`,
      });
    }

    const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer));
    const urls = await Promise.all(uploadPromises);

    res.status(200).json({ success: true, urls });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Image upload failed',
    });
  }
});

// ── Error handling middleware (must be last) ────────────────────────────
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (!res.headersSent) {
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || "Internal server error"
        });
    }
});

// ── HTTP server + Socket.IO (for live online-user tracking) ────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Tracks every open socket connection (tabs/sessions), not unique accounts.
const onlineSockets = new Set();

io.on('connection', (socket) => {
  onlineSockets.add(socket.id);
  io.emit('online-count', onlineSockets.size);
  console.log(`🟢 Client connected (${onlineSockets.size} online)`);

  socket.on('disconnect', () => {
    onlineSockets.delete(socket.id);
    io.emit('online-count', onlineSockets.size);
    console.log(`🔴 Client disconnected (${onlineSockets.size} online)`);
  });
});

app.get('/api/online-count', (req, res) => {
  res.json({ count: onlineSockets.size });
});

// Initialize database connection and start server
const startServer = async () => {
    try {
        await connectToMongoDB();

        httpServer.listen(port, () => {
            console.log(`🚀 Server is running on port ${port}`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
    console.log('📡 MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
});