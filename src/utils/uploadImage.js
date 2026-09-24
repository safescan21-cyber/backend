const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// ─── Read credentials from environment ──────────────────────────
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error(
    "❌ Missing Cloudinary credentials — please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file."
  );
} else {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  console.log("✅ Cloudinary configured successfully:", {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret_preview: apiSecret.slice(0, 4) + "..." + apiSecret.slice(-4),
    api_secret_length: apiSecret.length,
  });
}

// ─── Base upload options (shared for images & videos) ──────────
const baseOptions = {
  overwrite: true,
  invalidate: true,
  resource_type: "auto",      // auto‑detects image, video, or raw
  quality: "auto",            // automatic compression
  fetch_format: "auto",       // serve best format (WebP, HLS, etc.)
};

// ─── Additional video‑specific options ──────────────────────────
const videoOptions = {
  resource_type: "video",
  eager: [
    // Generate a 400x300 JPEG thumbnail
    { width: 400, height: 300, crop: "fill", format: "jpg" }
  ],
  eager_async: true,          // generate thumbnail asynchronously
  format: "mp4",              // ensure output is MP4 (H.264)
  video_codec: "h264",
  bit_rate: "2m",             // 2 Mbps – adjust as needed
  fps: 30,
  transformation: [
    { quality: "auto:low", fetch_format: "auto" },
  ],
  use_filename: true,
  unique_filename: true,
  folder: "videos",           // store all videos in a 'videos' folder
};

// ─── Image‑specific options (optional) ──────────────────────────
const imageOptions = {
  folder: "images",
  transformation: [
    { quality: "auto:good", fetch_format: "auto" }
  ],
};

/**
 * Uploads a file (image or video) to Cloudinary.
 * @param {string|Buffer} file - The file to upload (base64, file path, or Buffer)
 * @param {Object} [options] - Additional Cloudinary upload options (overrides defaults)
 * @param {boolean} [isVideo=false] - If true, apply video‑specific options
 * @returns {Promise<{ secure_url: string, thumbnail_url?: string }>}
 */
module.exports = (file, options = {}, isVideo = false) => {
  return new Promise((resolve, reject) => {
    // Merge base + specific options
    let uploadOptions = { ...baseOptions, ...options };

    if (isVideo) {
      uploadOptions = { ...uploadOptions, ...videoOptions };
    } else {
      // Optionally apply image‑specific defaults (you can skip this)
      uploadOptions = { ...uploadOptions, ...imageOptions };
    }

    cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
      if (error) {
        console.error("Cloudinary upload error:", error.message);
        return reject({ message: error.message });
      }
      if (!result || !result.secure_url) {
        return reject({ message: "Cloudinary upload failed: no result returned" });
      }

      // Log a summary
      const publicId = result.public_id;
      const format = result.format;
      const resourceType = result.resource_type;
      console.log(`✅ Uploaded ${resourceType} (${format}) – ${publicId}`);

      // If video and eager thumbnail was generated, return it too
      const thumbnailUrl = result.eager && result.eager.length > 0
        ? result.eager[0].secure_url
        : undefined;

      return resolve({
        secure_url: result.secure_url,
        thumbnail_url: thumbnailUrl,
      });
    });
  });
};