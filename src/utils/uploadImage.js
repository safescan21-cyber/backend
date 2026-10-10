require("dotenv").config();
const cloudinary = require("cloudinary").v2;

// ─── Read credentials from environment ──────────────────────────
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
  console.log(`✅ Cloudinary configured (cloud: ${cloudName})`);
} else if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ secure: true });
  console.log("✅ Cloudinary configured from CLOUDINARY_URL");
} else {
  console.error(
    "❌ Missing Cloudinary credentials — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in your .env file."
  );
}

// ─── Upload options ─────────────────────────────────────────────
// NOTE: quality/fetch_format "auto" are DELIVERY settings, not upload
// settings. Putting them in an upload call makes Cloudinary reject the file.
const baseOptions = {
  overwrite: true,
  invalidate: true,
  timeout: 600000, // 10 min for slow connections / big videos
};

const videoOptions = {
  resource_type: "video",
  folder: "videos",
  use_filename: true,
  unique_filename: true,
  // 400x300 JPEG thumbnail, generated in the background
  eager: [{ width: 400, height: 300, crop: "fill", format: "jpg" }],
  eager_async: true,
};

const imageOptions = {
  resource_type: "image",
  folder: "images",
};

// Adds automatic format/quality to the DELIVERY url of images
const optimizeImageUrl = (url) =>
  typeof url === "string" && url.includes("/image/upload/")
    ? url.replace("/image/upload/", "/image/upload/f_auto,q_auto/")
    : url;

const handleResult = (error, result, resolve, reject, isVideo) => {
  if (error) {
    console.error("Cloudinary upload error:", error.message || error);
    return reject(new Error(error.message || "Cloudinary upload failed"));
  }
  if (!result || !result.secure_url) {
    return reject(new Error("Cloudinary upload failed: no result returned"));
  }

  console.log(`✅ Uploaded ${result.resource_type} (${result.format}) – ${result.public_id}`);

  const thumbnailUrl =
    result.eager && result.eager.length > 0 ? result.eager[0].secure_url : undefined;

  return resolve({
    secure_url: isVideo ? result.secure_url : optimizeImageUrl(result.secure_url),
    thumbnail_url: thumbnailUrl,
  });
};

/**
 * Uploads a file (image or video) to Cloudinary.
 * @param {string|Buffer} file - path, URL, base64 data URI, or Buffer (multer memoryStorage)
 * @param {Object} [options] - extra Cloudinary options (override defaults)
 * @param {boolean} [isVideo=false]
 * @returns {Promise<{ secure_url: string, thumbnail_url?: string }>}
 */
module.exports = (file, options = {}, isVideo = false) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      ...baseOptions,
      ...(isVideo ? videoOptions : imageOptions),
      ...options,
    };
    const done = (error, result) => handleResult(error, result, resolve, reject, isVideo);

    if (Buffer.isBuffer(file)) {
      // Videos go in 6 MB chunks so large files don't fail
      const stream = isVideo
        ? cloudinary.uploader.upload_large_stream(null, { ...uploadOptions, chunk_size: 6000000 }, done)
        : cloudinary.uploader.upload_stream(uploadOptions, done);
      return stream.end(file);
    }

    if (isVideo) {
      return cloudinary.uploader.upload_large(file, { ...uploadOptions, chunk_size: 6000000 }, done);
    }
    return cloudinary.uploader.upload(file, uploadOptions, done);
  });
};
