const express = require("express");
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
require("dotenv").config();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const connectToMongoDB = require("./config/db");
const cookieParser = require('cookie-parser');
const productsRoute = require('./src/products/productsRoute')
const userRoutes = require('./src/users/Userroute');
const reviewRoutes =require("./src/review/reviewrouter")
const orderRoutes =require("./src/orders/ordersroute")
const statsRoutes = require('../Backend/src/stats/statsRoute')
const uploadImage = require("./src/utils/uploadImage")
const bodyParser = require('body-parser')
const helmet = require('helmet');
const jobsRoutes = require('./src/jobs/jobsRoute');


app.use(express.json());
app.use(bodyParser.json());
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // ✅ added PATCH
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});
// this sets COOP: same-origin by default
// After all your routes, add this error handler
app.use((err, req, res, next) => {
    // Set CORS headers for error responses as well
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.use('/api/auth', userRoutes);
app.use ('/api/products', productsRoute)
app.use('/api/reviews',reviewRoutes)
app.use('/api/orders',orderRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/jobs', jobsRoutes);


app.get('/', (req, res) => {
    return res.send("hello world");
});
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
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
        folder: 'products',   // optional: organise in Cloudinary folders
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

    // Upload all files to Cloudinary in parallel
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




// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    if (!res.headersSent) {
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
});

// Initialize database connection and start server
const startServer = async () => {
    try {
        await connectToMongoDB();
        
        app.listen(port, () => {
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