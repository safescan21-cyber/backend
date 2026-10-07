require("dotenv").config();
const cloudinary = require("cloudinary").v2;

// ─── Read credentials from environment ──────────────────────────
// Supports either the three separate variables or a single CLOUDINARY_URL.
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  // Never log the API key or secret (even partially).
  console.log(`✅ Cloudinary configured (cloud: ${cloudName})`);
} else if (process.env.CLOUDINARY_URL) {
  // The SDK reads CLOUDINARY_URL automatically; just force https URLs.
  cloudinary.config({ secure: true });
  console.log("✅ Cloudinary configured from CLOUDINARY_URL");
} else {
  console.error(
    "❌ Missing Cloudinary credentials — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in your .env file."
  );
}

// ─── Base upload options (shared for images & videos) ──────────
const baseOptions = {
  overwrite: true,
  invalidate: true,
  resource_type: "auto", // auto-detects image, video, or raw
  quality: "auto", // automatic compression
  fetch_format: "auto", // serve best format (WebP, HLS, etc.)
};

// ─── Additional video-specific options ──────────────────────────
const videoOptions = {
  resource_type: "video",
  eager: [
    // Generate a 400x300 JPEG thumbnail
    { width: 400, height: 300, crop: "fill", format: "jpg" },
  ],
  eager_async: true, // generate thumbnail asynchronously
  format: "mp4", // ensure output is MP4 (H.264)
  video_codec: "h264",
  bit_rate: "2m", // 2 Mbps – adjust as needed
  fps: 30,
  transformation: [{ quality: "auto:low", fetch_format: "auto" }],
  use_filename: true,
  unique_filename: true,
  folder: "videos", // store all videos in a 'videos' folder
};

// ─── Image-specific options ─────────────────────────────────────
const imageOptions = {
  folder: "images",
  transformation: [{ quality: "auto:good", fetch_format: "auto" }],
};

/**
 * Handles the Cloudinary response (shared by both upload paths).
 */
const handleResult = (error, result, resolve, reject) => {
  if (error) {
    console.error("Cloudinary upload error:", error.message);
    return reject(new Error(error.message));
  }
  if (!result || !result.secure_url) {
    return reject(new Error("Cloudinary upload failed: no result returned"));
  }

  console.log(
    `✅ Uploaded ${result.resource_type} (${result.format}) – ${result.public_id}`
  );

  // If video and eager thumbnail was generated, return it too
  const thumbnailUrl =
    result.eager && result.eager.length > 0
      ? result.eager[0].secure_url
      : undefined;

  return resolve({
    secure_url: result.secure_url,
    thumbnail_url: thumbnailUrl,
  });
};

/**
 * Uploads a file (image or video) to Cloudinary.
 * @param {string|Buffer} file - File path, URL, base64 data URI, or a Buffer (e.g. multer memoryStorage)
 * @param {Object} [options] - Additional Cloudinary upload options (override the defaults)
 * @param {boolean} [isVideo=false] - If true, apply video-specific options
 * @returns {Promise<{ secure_url: string, thumbnail_url?: string }>}
 */
module.exports = (file, options = {}, isVideo = false) => {
  return new Promise((resolve, reject) => {
    // Merge base + specific options
    const uploadOptions = {
      ...baseOptions,
      ...(isVideo ? videoOptions : imageOptions),
      ...options,
    };

    // Buffers must be sent through upload_stream
    if (Buffer.isBuffer(file)) {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => handleResult(error, result, resolve, reject)
      );
      return stream.end(file);
    }

    // Strings: file path, remote URL, or base64 data URI
    cloudinary.uploader.upload(file, uploadOptions, (error, result) =>
      handleResult(error, result, resolve, reject)
    );
  });
};