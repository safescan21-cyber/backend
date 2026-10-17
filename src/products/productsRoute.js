const express = require('express');
const mongoose = require('mongoose'); // ✅ added — needed for ObjectId validation
const router = express.Router();
const Products = require('../products/productsmodel');
const { verifyToken, verifyAdmin } = require('../middlewere/authMiddleware');
const Reviews = require('../review/reviewsmodel');
const { pingIndexNow } = require("../utils/indexnow");
const { cacheGet, clearOnWrite } = require("../utils/cache");
const { cleanDocuments } = require("../documents/documentFiles");

// Only valid, uploaded documents are stored on a product
const withCleanDocuments = (body) => {
  const documents = cleanDocuments(body.documents);
  const out = { ...body };
  if (documents === undefined) delete out.documents; else out.documents = documents;
  return out;
};

// Any admin change empties the cached public lists
router.use(clearOnWrite);

// ============ CREATE PRODUCT (ADMIN ONLY) ============
router.post("/create-product", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const newproduct = new Products(withCleanDocuments(req.body));
    const savedproduct = await newproduct.save();

    const reviews = await Reviews.find({ productId: savedproduct._id });
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      savedproduct.rating = averageRating;
      await savedproduct.save();
    }

    pingIndexNow([`/shop/${savedproduct._id}`, '/shop']);
    res.status(201).send(savedproduct);
  } catch (error) {
    console.error("Error creating new product", error);
    res.status(500).send({ message: error.message || "Failed to create new product" });
  }
});

router.get("/", cacheGet(30000), async (req, res) => {
  try {
    const {
      category,
      color,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (color && color !== "all") {
      filter.color = color;
    }

    if (minPrice && maxPrice) {
      const min = parseFloat(minPrice);
      const max = parseFloat(maxPrice);
      if (!isNaN(min) && !isNaN(max)) {
        filter.price = { $gte: min, $lte: max };
      }
    }

    // page ≥ 1, limit 1–1000 (negative or huge values used to crash the query)
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;
    const totalProducts = await Products.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limitNum);

    const products = await Products.find(filter)
      .skip(skip)
      .limit(limitNum)
      .populate("author", "email")
      .sort({ createdAt: -1 });

    res.status(200).send({ products, totalPages, totalProducts });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ message: "Failed to fetch products" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(404).send({ message: "Product not found" });
    }
    const product = await Products.findById(productId).populate(
      "author",
      "email username"
    );
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    const reviews = await Reviews.find({ productId }).populate(
      "userId",
      "username email"
    );
    res.status(200).send({ product, reviews });
  } catch (error) {
    console.error("Error fetching the product", error);
    res.status(500).send({ message: "Failed to fetch the product" });
  }
});

router.patch("/update-product/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const updatedProduct = await Products.findByIdAndUpdate(
      productId,
      withCleanDocuments(req.body),
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).send({ message: "Product not found" });
    }

    pingIndexNow([`/shop/${updatedProduct._id}`]);
    res.status(200).send({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating the product", error);
    res.status(500).send({ message: "Failed to update the product" });
  }
});

router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const deletedProduct = await Products.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).send({ message: "Product not found" });
    }

    await Reviews.deleteMany({ productId: productId });

    res.status(200).send({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting the product", error);
    res.status(500).send({ message: "Failed to delete the product" });
  }
});

// ✅ single, corrected version — removed the duplicate earlier in the file
router.get("/related/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid product ID format" });
    }

    const product = await Products.findById(id);
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }

    let terms = [];
    if (product.name && typeof product.name === 'string') {
      terms = product.name.split(" ").filter(word => word.length > 1);
    }

    const titleRegex = terms.length > 0 ? new RegExp(terms.join("|"), "i") : null;

    const query = { _id: { $ne: id } };
    const orConditions = [];
    if (titleRegex) orConditions.push({ name: { $regex: titleRegex } });
    if (product.category) orConditions.push({ category: product.category });

    if (orConditions.length === 0) {
      return res.status(200).send([]);
    }

    query.$or = orConditions;

    const relatedProducts = await Products.find(query).limit(10);
    res.status(200).send(relatedProducts);

  } catch (error) {
    console.error("Error fetching related products:", error);
    res.status(500).send({ message: "Failed to fetch related products" });
  }
});

module.exports = router;