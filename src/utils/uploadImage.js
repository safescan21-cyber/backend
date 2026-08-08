const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const config = cloudinary.config();

if (!config.cloud_name || !config.api_key || !config.api_secret) {
  console.error("❌ Missing Cloudinary credentials — check your .env file.");
} else {
  // Safe debug log — shows partial values only, never the full secret
  console.log("Cloudinary config loaded:", {
    cloud_name: config.cloud_name,
    api_key: config.api_key,
    api_secret_preview: config.api_secret.slice(0, 4) + "..." + config.api_secret.slice(-4),
    api_secret_length: config.api_secret.length,
  });
}

const opts = {
  overwrite: true,
  invalidate: true,
  resource_type: "auto",
};

module.exports = (image) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(image, opts, (error, result) => {
      if (error) {
        console.error("Cloudinary upload error:", error.message);
        return reject({ message: error.message });
      }
      if (!result || !result.secure_url) {
        return reject({ message: "Cloudinary upload failed: no result returned" });
      }
      return resolve(result.secure_url);
    });
  });
};