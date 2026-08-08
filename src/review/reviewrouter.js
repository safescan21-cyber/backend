const express = require("express");
const Reviews = require("./reviewsmodel");
const router = express.Router();

// POST a new review (or update existing)
router.post("/post-review", async (req, res) => {
  try {
    const { comment, rating, productId, userId, userName, userImage, images, verified } = req.body;

    if (!comment || !rating || !productId || !userId) {
      return res.status(400).send({ message: "All required fields must be provided" });
    }

    const existingReview = await Reviews.findOne({ productId, userId });

    if (existingReview) {
      // update
      existingReview.comment = comment;
      existingReview.rating = rating;
      existingReview.userName = userName || existingReview.userName;
      existingReview.userImage = userImage || existingReview.userImage;
      existingReview.images = images || existingReview.images;
      existingReview.verified = verified || existingReview.verified;
      await existingReview.save();
    } else {
      // create new
      const newReview = new Reviews({
        comment, rating, productId, userId,
        userName: userName || "Anonymous",
        userImage: userImage || "",
        images: images || [],
        verified: verified || false
      });
      await newReview.save();
    }

    // (Optional) If you later store products in MongoDB, you can recalculate rating here.
    // For now we skip it because products are in local JSON.

    res.status(200).send({ message: "Review processed successfully" });
  } catch (error) {
    console.error("Error posting review", error);
    res.status(500).send({ message: "Failed to post review" });
  }
});

// GET total reviews count
router.get("/total-reviews", async (req, res) => {
  try {
    const totalReviews = await Reviews.countDocuments({});
    res.status(200).send({ totalReviews });
  } catch (error) {
    res.status(500).send({ message: "Failed to get review count" });
  }
});

// GET reviews for a specific product (productId is now a string)
router.get("/product/:productId", async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    return res.status(400).send({ message: "Product ID is required" });
  }
  try {
    const reviews = await Reviews.find({ productId }).sort({ createdAt: -1 });
    res.status(200).send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews" });
  }
});

// GET reviews by user ID
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).send({ message: "User ID is required" });
  try {
    const reviews = await Reviews.find({ userId }).sort({ createdAt: -1 });
    res.status(200).send(reviews);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews" });
  }
});

module.exports = router;