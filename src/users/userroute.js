const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const express = require("express");
const { verifyToken, verifyAdmin } = require("../../src/middlewere/authMiddleware");
const User = require("../users/Usermodel");
const { sendResetEmail, sendWelcomeEmail } = require("./email");

// ── Firebase Admin (used only by Google login) ──────────────────────────────
// Loaded defensively so a missing package or key never crashes the whole API.
let admin = null;
try {
  admin = require("firebase-admin");
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (raw) {
      const serviceAccount = JSON.parse(raw);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
      }
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_KEY not set — Google login disabled");
    }
  }
} catch (err) {
  console.warn("⚠️ Firebase Admin not available — Google login disabled:", err.message);
  admin = null;
}

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "fallback_secret_key",
    { expiresIn: "30d" }
  );
};

const toClientUser = (user) => ({
  _id: user._id,
  email: user.email,
  username: user.name,
  role: user.role,
  profileImage: user.profilePicture,
  bio: user.bio,
  profession: user.profession,
  address: user.address || {},
  addresses: user.addresses || [],
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax", // site and API share foodpharmamachinery.com, so "lax" works
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// Case-insensitive email handling (works with older mixed-case records too)
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const findByEmail = (email) =>
  User.findOne({ email }).collation({ locale: "en", strength: 2 });

const maskEmail = (email) => {
  const [local = "", domain = ""] = String(email).split("@");
  return `${local.slice(0, 2)}***@${domain}`;
};

// An email problem must never break registration or login
const sendWelcomeSafely = (email, name) =>
  Promise.resolve()
    .then(() => sendWelcomeEmail(email, name))
    .catch((err) => console.error("Welcome email failed:", err.message || err));

// ── Register ──────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    // Temporary diagnostic: two lines with the same address a moment apart
    // mean the frontend is sending the request twice.
    console.log(`[register] attempt ${maskEmail(email)} at ${new Date().toISOString()}`);

    if (!name || !email || !password) {
      return res.status(400).send({ message: "Name, email, and password are required" });
    }

    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.status(409).send({ message: "User already exists with this email" });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();

    const token = generateToken(newUser);
    res.cookie("token", token, cookieOptions);

    sendWelcomeSafely(email, name);

    res.status(201).send({
      message: "Registered successfully",
      user: toClientUser(newUser),
    });
  } catch (error) {
    // Two simultaneous requests can both pass the check; the database index catches the second
    if (error && error.code === 11000) {
      return res.status(409).send({ message: "User already exists with this email" });
    }
    console.error("Error registering user:", error);
    if (!res.headersSent) {
      res.status(500).send({ message: "Error registering user" });
    }
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).send({ message: "Email and password are required" });
    }

    const user = await findByEmail(email);
    if (!user) return res.status(404).send({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send({ message: "Password not match" });

    const token = generateToken(user);
    res.cookie("token", token, cookieOptions);

    res.status(200).send({
      message: "Logged in successfully",
      user: toClientUser(user),
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).send({ message: "Error logging in user" });
  }
});

// ── Google login/register (Firebase ID token) ─────────────────────────────────
// Frontend gets the token from Firebase Auth (result.user.getIdToken()) and we
// verify it here with the Firebase Admin SDK.
router.post("/google", async (req, res) => {
  try {
    if (!admin || !admin.apps.length) {
      console.error("Google login requested but Firebase Admin is not configured");
      return res.status(503).json({ message: "Google login is not available right now" });
    }

    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "Missing ID token" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { name, picture } = decoded;
    const email = normalizeEmail(decoded.email);
    if (!email) return res.status(400).json({ message: "No email from Google" });

    let user = await findByEmail(email);
    let isNewUser = false;

    if (!user) {
      const randomPassword = crypto.randomBytes(20).toString("hex");
      user = new User({
        name: name || email.split("@")[0],
        email,
        password: randomPassword,
        profilePicture: picture || undefined,
      });
      await user.save();
      isNewUser = true;
    }

    if (isNewUser) sendWelcomeSafely(email, user.name);

    const token = generateToken(user);
    res.cookie("token", token, cookieOptions);

    res.status(200).json({
      message: "Logged in with Google successfully",
      user: toClientUser(user),
    });
  } catch (error) {
    console.error("Google auth error:", error.message || error);
    res.status(401).json({ message: "Google authentication failed" });
  }
});

// ── Profile ───────────────────────────────────────────────────────────────────
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Token is valid",
      user: toClientUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Admin only ────────────────────────────────────────────────────────────────
router.get("/admin", verifyToken, verifyAdmin, (req, res) => {
  res.status(200).json({ message: "Welcome Admin", role: req.role });
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ message: "Logged out successfully" });
});

// ── Get all users (admin only: it exposes names and emails) ──────────────────
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Update user (admin) ──────────────────────────────────────────────────────
router.put("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, email, profilePicture, bio, profession, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, profilePicture, bio, profession, role },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User updated successfully", user: toClientUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Delete user ───────────────────────────────────────────────────────────────
router.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Edit profile ──────────────────────────────────────────────────────────────
router.patch("/edit-profile", verifyToken, async (req, res) => {
  try {
    const { username, profileImage, bio, profession, address } = req.body;
    const userId = req.userId;

    const user = await User.findByIdAndUpdate(
      userId,
      { name: username, profilePicture: profileImage, bio, profession, address },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Profile updated successfully",
      user: toClientUser(user),
    });
  } catch (error) {
    console.error("Edit profile error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── Forgot password ───────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).send({ message: "Email is required" });

    const user = await findByEmail(email);
    if (!user) return res.status(404).send({ message: "No account found with this email" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    await sendResetEmail(user.email, resetToken);

    res.status(200).send({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    res.status(500).send({ message: "Error sending reset email" });
  }
});

// ── Reset password ────────────────────────────────────────────────────────────
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).send({ message: "Invalid or expired reset token" });

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).send({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error in reset-password:", error);
    res.status(500).send({ message: "Error resetting password" });
  }
});

// ── Create admin (now admin-only: it used to be open to anyone) ──────────────
router.post("/create-admin", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).send({ message: "Name, email, and password are required" });
    }
    const existingUser = await findByEmail(email);
    if (existingUser) return res.status(409).send({ message: "User already exists" });

    const newAdmin = new User({ name, email, password, role: "admin" });
    await newAdmin.save();

    res.status(201).send({ message: "Admin created successfully", user: toClientUser(newAdmin) });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).send({ message: "User already exists" });
    }
    console.error("Error creating admin:", error);
    res.status(500).send({ message: "Error creating admin" });
  }
});

// ── Address management ────────────────────────────────────────────────────────
router.post("/address", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { address, label } = req.body;

    if (!address || typeof address !== "object") {
      return res.status(400).json({ message: "Address is required" });
    }

    const required = ["firstName", "lastName", "email", "phone", "addressLine1", "city", "state", "pincode"];
    for (const field of required) {
      if (!address[field]) {
        return res.status(400).json({ message: `Missing required field: ${field}` });
      }
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newAddress = { label: label || "Home", ...address };

    if (user.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      message: "Address saved successfully",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error saving address:", error);
    res.status(500).json({ message: "Server error while saving address" });
  }
});

router.get("/addresses", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ addresses: user.addresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/address/default/:addressId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses.forEach((addr) => (addr.isDefault = false));

    const target = user.addresses.id(req.params.addressId);
    if (!target) return res.status(404).json({ message: "Address not found" });
    target.isDefault = true;

    await user.save();
    res.status(200).json({ message: "Default address updated", addresses: user.addresses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/address/:addressId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses = user.addresses.filter((addr) => addr._id.toString() !== req.params.addressId);
    await user.save();
    res.status(200).json({ message: "Address removed", addresses: user.addresses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;