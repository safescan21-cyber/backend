const express = require("express");
const crypto = require("crypto");
const Reviews = require("./reviewsmodel");
const User = require("../users/Usermodel");
const Products = require("../products/productsmodel");
const { verifyToken, verifyAdmin, optionalAuth } = require("../middlewere/authMiddleware");
const { tooMany } = require("../utils/rateLimit");
const router = express.Router();

const clean = (text, max) => String(text || "").replace(/\s+/g, " ").trim().slice(0, max);

const userNameFor = async (userId, fallback = "Customer") => {
  const u = await User.findById(userId).select("name email").lean().catch(() => null);
  return u?.name || u?.email?.split("@")[0] || fallback;
};

// What visitors see: counts instead of who reacted, and no blocked comments
const toPublic = (review, viewerId) => {
  const r = review.toObject ? review.toObject() : review;
  const likes = r.likes || [];
  const dislikes = r.dislikes || [];
  return {
    _id: r._id,
    productId: r.productId,
    comment: r.comment,
    rating: r.rating,
    userName: r.userName,
    userImage: r.userImage,
    images: r.images || [],
    verified: r.verified,
    helpful: r.helpful,
    createdAt: r.createdAt,
    likeCount: likes.length,
    dislikeCount: dislikes.length,
    myReaction: viewerId ? (likes.includes(viewerId) ? "like" : dislikes.includes(viewerId) ? "dislike" : null) : null,
    comments: (r.comments || [])
      .filter((c) => !c.isBlocked)
      .map((c) => ({ _id: c._id, userName: c.userName, text: c.text, createdAt: c.createdAt })),
  };
};

// POST a new review (or update the logged-in user's existing one)
router.post("/post-review", optionalAuth, async (req, res) => {
  try {
    const { productId, userImage, images } = req.body;
    const comment = clean(req.body.comment, 3000);
    const rating = Number(req.body.rating);

    if (!comment || !productId || !(rating >= 1 && rating <= 5)) {
      return res.status(400).send({ message: "Please add a rating and a comment" });
    }
    if (typeof productId !== "string" || !/^[a-f0-9]{24}$/i.test(productId)) {
      return res.status(400).send({ message: "Unknown product" });
    }
    // Logged-in customers have one review per product; guests are limited per network
    if (!req.userId && tooMany(`review:${req.ip}`, 5, 15 * 60 * 1000)) {
      return res.status(429).send({ message: "Too many reviews from your network. Please try again later." });
    }

    if (req.userId) {
      // Logged in: one review per product, updated on resubmit
      const userName = await userNameFor(req.userId, clean(req.body.userName, 60) || "Customer");
      const review = await Reviews.findOneAndUpdate(
        { productId, userId: String(req.userId) },
        {
          $set: { comment, rating, userName, userImage: userImage || "", images: Array.isArray(images) ? images.slice(0, 6) : [] },
          $setOnInsert: { productId, userId: String(req.userId), createdAt: new Date() },
        },
        { upsert: true, new: true }
      );
      return res.status(200).send({ message: "Review processed successfully", review: toPublic(review, String(req.userId)) });
    }

    // Guest: always a new review (each guest gets their own ID)
    const review = await Reviews.create({
      comment,
      rating,
      productId,
      userId: `guest:${crypto.randomBytes(8).toString("hex")}`,
      userName: clean(req.body.userName, 60) || "Anonymous",
      userImage: userImage || "",
      images: Array.isArray(images) ? images.slice(0, 6) : [],
    });
    res.status(200).send({ message: "Review processed successfully", review: toPublic(review) });
  } catch (error) {
    console.error("Error posting review", error);
    res.status(500).send({ message: "Failed to post review" });
  }
});

// GET total reviews count (visible reviews only)
router.get("/total-reviews", async (req, res) => {
  try {
    const totalReviews = await Reviews.countDocuments({ isBlocked: { $ne: true } });
    res.status(200).send({ totalReviews });
  } catch (error) {
    res.status(500).send({ message: "Failed to get review count" });
  }
});

// GET reviews for a product (blocked reviews and comments are hidden)
router.get("/product/:productId", optionalAuth, async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    return res.status(400).send({ message: "Product ID is required" });
  }
  try {
    const reviews = await Reviews.find({ productId, isBlocked: { $ne: true } }).sort({ createdAt: -1 }).lean();
    res.status(200).send(reviews.map((r) => toPublic(r, req.userId && String(req.userId))));
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews" });
  }
});

// POST like / dislike (click again to undo). Login required.
router.post("/:id/react", verifyToken, async (req, res) => {
  const { type } = req.body;
  if (!["like", "dislike"].includes(type)) {
    return res.status(400).send({ message: "type must be like or dislike" });
  }
  try {
    const uid = String(req.userId);
    const review = await Reviews.findOne({ _id: req.params.id, isBlocked: { $ne: true } }).catch(() => null);
    if (!review) return res.status(404).send({ message: "Review not found" });

    const same = type === "like" ? "likes" : "dislikes";
    const other = type === "like" ? "dislikes" : "likes";
    const already = review[same].includes(uid);

    review[other] = review[other].filter((x) => x !== uid);
    review[same] = already ? review[same].filter((x) => x !== uid) : [...review[same], uid];
    await review.save();

    res.status(200).send(toPublic(review, uid));
  } catch (error) {
    console.error("Error reacting to review", error);
    res.status(500).send({ message: "Failed to save your reaction" });
  }
});

// POST a comment on a review. Login required.
router.post("/:id/comments", verifyToken, async (req, res) => {
  const text = clean(req.body.text, 1000);
  if (text.length < 2) return res.status(400).send({ message: "Please write a comment" });
  try {
    const review = await Reviews.findOne({ _id: req.params.id, isBlocked: { $ne: true } }).catch(() => null);
    if (!review) return res.status(404).send({ message: "Review not found" });

    review.comments.push({ userId: String(req.userId), userName: await userNameFor(req.userId), text });
    await review.save();
    res.status(201).send(toPublic(review, String(req.userId)));
  } catch (error) {
    console.error("Error adding comment", error);
    res.status(500).send({ message: "Failed to add comment" });
  }
});

// ── Admin moderation ────────────────────────────────────────────

// GET all reviews with comments, including blocked ones
router.get("/admin/all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status === "blocked") {
      filter.$or = [{ isBlocked: true }, { "comments.isBlocked": true }];
    }
    const q = clean(req.query.q, 100);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$and = [{ $or: [{ comment: rx }, { userName: rx }, { "comments.text": rx }] }];
    }
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const page = Math.max(Number(req.query.page) || 1, 1);

    const [reviews, total] = await Promise.all([
      Reviews.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Reviews.countDocuments(filter),
    ]);

    // Attach product names
    const ids = [...new Set(reviews.map((r) => r.productId))].filter((id) => /^[a-f0-9]{24}$/i.test(id));
    const products = await Products.find({ _id: { $in: ids } }).select("name").lean().catch(() => []);
    const names = Object.fromEntries(products.map((p) => [String(p._id), p.name]));

    res.status(200).send({
      total,
      page,
      reviews: reviews.map((r) => ({
        ...r,
        productName: names[r.productId] || null,
        likeCount: (r.likes || []).length,
        dislikeCount: (r.dislikes || []).length,
        likes: undefined,
        dislikes: undefined,
      })),
    });
  } catch (error) {
    console.error("Error listing reviews for admin", error);
    res.status(500).send({ message: "Failed to load reviews" });
  }
});

// PATCH block / unblock a review
router.patch("/admin/:id/block", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const blocked = Boolean(req.body.blocked);
    const review = await Reviews.findByIdAndUpdate(
      req.params.id,
      { isBlocked: blocked, blockedAt: blocked ? new Date() : null },
      { new: true }
    ).catch(() => null);
    if (!review) return res.status(404).send({ message: "Review not found" });
    res.status(200).send({ message: blocked ? "Review blocked" : "Review unblocked", isBlocked: review.isBlocked });
  } catch (error) {
    res.status(500).send({ message: "Failed to update review" });
  }
});

// PATCH block / unblock one comment
router.patch("/admin/:id/comments/:commentId/block", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const review = await Reviews.findById(req.params.id).catch(() => null);
    const comment = review?.comments.id(req.params.commentId);
    if (!comment) return res.status(404).send({ message: "Comment not found" });
    comment.isBlocked = Boolean(req.body.blocked);
    await review.save();
    res.status(200).send({ message: comment.isBlocked ? "Comment blocked" : "Comment unblocked", isBlocked: comment.isBlocked });
  } catch (error) {
    res.status(500).send({ message: "Failed to update comment" });
  }
});

// GET reviews by user ID
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).send({ message: "User ID is required" });
  try {
    const reviews = await Reviews.find({ userId }).sort({ createdAt: -1 }).lean();
    res.status(200).send(reviews.map((r) => ({ ...toPublic(r), userId: r.userId, isBlocked: r.isBlocked })));
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reviews" });
  }
});

module.exports = router;
