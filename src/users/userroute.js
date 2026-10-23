const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const express = require("express");
const { verifyToken, verifyAdmin } = require("../../src/middlewere/authMiddleware");
const User = require("../users/Usermodel");
const { sendResetEmail, sendWelcomeEmail } = require("./email");
const {
  OtpCode,
  OTP_TTL_MS,
  OTP_RESEND_MS,
  OTP_MAX_ATTEMPTS,
  generateOtp,
  hashOtp,
  safeEqual,
  sendOtpEmail,
} = require("./otp");

// ── Firebase Admin (used only by Google login) ──────────────────────────────
// Loaded defensively so a missing package or key never crashes the whole API.
// Verifying a Google ID token only needs the project ID (Firebase checks it
// against Google's public keys), so a full service account is optional.
const loadServiceAccount = () => {
  const fix = (acc) => {
    if (acc?.private_key) acc.private_key = acc.private_key.replace(/\\n/g, "\n");
    return acc?.private_key?.includes("BEGIN PRIVATE KEY") ? acc : null;
  };

  // 1) Whole JSON in one variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const acc = fix(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
      if (acc) return acc;
    } catch (err) {
      console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON:", err.message);
    }
  }

  // 2) Separate variables (private key stored base64-encoded)
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY_B64 } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY_B64) {
    const acc = fix({
      project_id: FIREBASE_PROJECT_ID,
      client_email: FIREBASE_CLIENT_EMAIL,
      private_key: Buffer.from(FIREBASE_PRIVATE_KEY_B64, "base64").toString("utf8"),
    });
    if (acc) return acc;
  }

  // 3) Key file next to the source (git-ignored)
  try {
    return fix(require("../serviceAccountKey.json"));
  } catch {
    return null;
  }
};

let admin = null;
try {
  admin = require("firebase-admin");
  if (!admin.apps.length) {
    const serviceAccount = loadServiceAccount();
    const projectId = serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID;

    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId });
    } else if (projectId) {
      admin.initializeApp({ projectId });
      console.log("ℹ️ Firebase Admin running with project ID only (enough for Google login)");
    } else {
      console.warn("⚠️ No Firebase project configured — Google login disabled");
      admin = null;
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
// Accepts "a@b.com" and also { email: "a@b.com" } (older frontend builds send the nested shape)
const normalizeEmail = (value) => {
  if (value && typeof value === "object") value = value.email;
  return String(value || "").trim().toLowerCase();
};
// Emails are saved lowercase, so the exact match (which uses the unique index)
// finds almost everyone; the case-insensitive scan only runs for old records.
const findByEmail = async (email) =>
  (await User.findOne({ email })) ||
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

// ── Simple in-memory attempt limiter (per key, sliding window) ────────────────
const MIN_PASSWORD = 6; // same rule as the reset-password page
const attemptBuckets = new Map();
const tooManyAttempts = (key, max, windowMs) => {
  const now = Date.now();
  const list = (attemptBuckets.get(key) || []).filter((t) => now - t < windowMs);
  attemptBuckets.set(key, list);
  if (attemptBuckets.size > 20000) attemptBuckets.clear();
  return list.length >= max;
};
const recordAttempt = (key) => {
  const list = attemptBuckets.get(key) || [];
  list.push(Date.now());
  attemptBuckets.set(key, list);
};

// ── Two-step login for admins ─────────────────────────────────────────────────
// A correct password (or Google) is step one; for an admin we then email a 6-digit
// code and only hand out the login token after POST /login/2fa.
// ADMIN_TWO_STEP=off in .env switches it off (escape hatch if email sending breaks).
const twoStepOn = () => String(process.env.ADMIN_TWO_STEP || "on").toLowerCase() !== "off";
const needsTwoStep = (user) => user.role === "admin" && twoStepOn();
const twoStepKey = (user) => `2fa:${user._id}`; // stored in OtpCode.email
// Own secret, so a challenge can never pass verifyToken as a login
const challengeSecret = () => `${process.env.JWT_SECRET || "fallback_secret_key"}:admin-2fa`;
const readChallenge = (challenge) => {
  try {
    const d = jwt.verify(String(challenge || ""), challengeSecret());
    return d.purpose === "2fa" ? d.id : null;
  } catch {
    return null;
  }
};

const sendTwoStepCode = async (user) => {
  const key = twoStepKey(user);
  const existing = await OtpCode.findOne({ email: key });
  if (existing) {
    const wait = OTP_RESEND_MS - (Date.now() - new Date(existing.lastSentAt).getTime());
    if (wait > 0) return { wait: Math.ceil(wait / 1000) };
  }
  const code = generateOtp();
  await OtpCode.findOneAndUpdate(
    { email: key },
    { email: key, codeHash: hashOtp(key, code), attempts: 0, lastSentAt: new Date(), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  try {
    await sendOtpEmail(user.email, code);
  } catch (err) {
    await OtpCode.deleteOne({ email: key }).catch(() => {});
    throw err;
  }
  console.log(`[2fa] admin code sent to ${maskEmail(user.email)}`);
  return {};
};

// Reply for step one: no token yet, just a short-lived challenge for step two
const startTwoStep = async (user, res) => {
  try {
    await sendTwoStepCode(user);
  } catch (err) {
    console.error("Admin 2-step email failed:", err.message || err);
    return res.status(500).json({ message: "We could not email your login code. Please try again in a minute." });
  }
  res.status(200).json({
    twoStep: true,
    challenge: jwt.sign({ id: user._id, purpose: "2fa" }, challengeSecret(), { expiresIn: "15m" }),
    email: maskEmail(user.email),
    message: `We emailed a 6-digit code to ${maskEmail(user.email)}.`,
  });
};

router.post("/login/2fa", async (req, res) => {
  try {
    const id = readChallenge(req.body.challenge);
    const otp = String(req.body.otp || "").replace(/\s+/g, "");
    if (!id) return res.status(401).json({ message: "This login has expired. Please log in again." });
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ message: "Enter the 6-digit code from your email." });

    const user = await User.findById(id);
    if (!user) return res.status(401).json({ message: "Please log in again." });
    const key = twoStepKey(user);
    const record = await OtpCode.findOne({ email: key });
    if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
      if (record) await OtpCode.deleteOne({ email: key }).catch(() => {});
      return res.status(400).json({ message: "This code has expired. Please ask for a new one." });
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await OtpCode.deleteOne({ email: key }).catch(() => {});
      return res.status(429).json({ message: "Too many wrong attempts. Please log in again." });
    }
    if (!safeEqual(record.codeHash, hashOtp(key, otp))) {
      record.attempts += 1;
      await record.save();
      const left = OTP_MAX_ATTEMPTS - record.attempts;
      return res.status(400).json({
        message: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong attempts. Please log in again.",
      });
    }
    await OtpCode.deleteOne({ email: key });

    const token = generateToken(user);
    res.cookie("token", token, cookieOptions);
    res.status(200).json({ message: "Logged in successfully", token, user: toClientUser(user) });
  } catch (error) {
    console.error("Admin 2-step verify error:", error.message || error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.post("/login/2fa/resend", async (req, res) => {
  try {
    const id = readChallenge(req.body.challenge);
    const user = id && (await User.findById(id));
    if (!user) return res.status(401).json({ message: "This login has expired. Please log in again." });
    const { wait } = await sendTwoStepCode(user);
    if (wait) return res.status(429).json({ message: `Please wait ${wait} seconds before asking for a new code.`, retryAfter: wait });
    res.status(200).json({ message: `A new code has been sent to ${maskEmail(user.email)}.` });
  } catch (error) {
    console.error("Admin 2-step resend error:", error.message || error);
    res.status(500).json({ message: "We could not email your login code. Please try again in a minute." });
  }
});

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
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).send({ message: "Please enter a valid email address" });
    }
    if (String(password).length < MIN_PASSWORD) {
      return res.status(400).send({ message: `Password must be at least ${MIN_PASSWORD} characters` });
    }
    if (name.length > 60) {
      return res.status(400).send({ message: "Name is too long" });
    }
    if (tooManyAttempts(`register:${req.ip}`, 10, 60 * 60 * 1000)) {
      return res.status(429).send({ message: "Too many sign-ups from your network. Please try again later." });
    }
    recordAttempt(`register:${req.ip}`);

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
      token, // also returned in the body so the frontend can send it as a Bearer header
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

    // Slow down password guessing: 10 failed tries per email+IP per 15 minutes
    const limitKey = `login:${req.ip}:${email}`;
    if (tooManyAttempts(limitKey, 10, 15 * 60 * 1000)) {
      return res.status(429).send({ message: "Too many failed attempts. Please wait 15 minutes or reset your password." });
    }

    // Same answer for "no account" and "wrong password", so emails can't be probed
    const user = await findByEmail(email);
    const isMatch = user ? await bcrypt.compare(String(password), user.password) : false;
    if (!user || !isMatch) {
      recordAttempt(limitKey);
      return res.status(401).send({ message: "Incorrect email or password" });
    }
    attemptBuckets.delete(limitKey);
    if (needsTwoStep(user)) return startTwoStep(user, res);

    const token = generateToken(user);
    res.cookie("token", token, cookieOptions);

    res.status(200).send({
      message: "Logged in successfully",
      token, // also returned in the body so the frontend can send it as a Bearer header
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
    if (decoded.email_verified === false) {
      return res.status(401).json({ message: "Your Google email is not verified" });
    }

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
    if (needsTwoStep(user)) return startTwoStep(user, res);

    const token = generateToken(user);
    res.cookie("token", token, cookieOptions);

    res.status(200).json({
      message: "Logged in with Google successfully",
      token, // also returned in the body so the frontend can send it as a Bearer header
      user: toClientUser(user),
    });
  } catch (error) {
    console.error("Google auth error:", error.message || error);
    res.status(401).json({ message: "Google authentication failed" });
  }
});

// ── Login with email OTP ──────────────────────────────────────────────────────
// 1) POST /otp/request { email }       → emails a 6-digit code (valid 10 minutes)
// 2) POST /otp/verify  { email, otp }  → logs in (creates the account if new)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// light per-IP limit on code requests: 10 per 15 minutes
const otpHits = new Map();
const otpIpLimited = (ip) => {
  const now = Date.now();
  const list = (otpHits.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  list.push(now);
  otpHits.set(ip, list);
  return list.length > 10;
};

router.post("/otp/request", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (otpIpLimited(req.ip)) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    const existing = await OtpCode.findOne({ email });
    if (existing) {
      const wait = OTP_RESEND_MS - (Date.now() - new Date(existing.lastSentAt).getTime());
      if (wait > 0) {
        return res.status(429).json({
          message: `Please wait ${Math.ceil(wait / 1000)} seconds before asking for a new code.`,
          retryAfter: Math.ceil(wait / 1000),
        });
      }
    }

    const code = generateOtp();
    await OtpCode.findOneAndUpdate(
      { email },
      {
        email,
        codeHash: hashOtp(email, code),
        attempts: 0,
        lastSentAt: new Date(),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendOtpEmail(email, code);
    } catch (mailErr) {
      console.error("OTP email failed:", mailErr.message || mailErr);
      await OtpCode.deleteOne({ email }).catch(() => {});
      return res.status(500).json({ message: "We could not send the code right now. Please try again later." });
    }

    console.log(`[otp] code sent to ${maskEmail(email)}`);
    res.status(200).json({ message: "A 6-digit code has been sent to your email.", expiresInSeconds: OTP_TTL_MS / 1000 });
  } catch (error) {
    console.error("OTP request error:", error.message || error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.post("/otp/verify", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").replace(/\s+/g, "");
    if (!email || !EMAIL_RE.test(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Enter the 6-digit code from your email." });
    }

    const record = await OtpCode.findOne({ email });
    if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
      if (record) await OtpCode.deleteOne({ email }).catch(() => {});
      return res.status(400).json({ message: "This code has expired. Please request a new one." });
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await OtpCode.deleteOne({ email }).catch(() => {});
      return res.status(429).json({ message: "Too many wrong attempts. Please request a new code." });
    }

    if (!safeEqual(record.codeHash, hashOtp(email, otp))) {
      record.attempts += 1;
      await record.save();
      const left = OTP_MAX_ATTEMPTS - record.attempts;
      return res.status(400).json({
        message: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong attempts. Please request a new code.",
      });
    }

    // Correct code: use it once only
    await OtpCode.deleteOne({ email });

    let user = await findByEmail(email);
    // The email code is the admin's second step, so on its own it is not enough
    if (user && needsTwoStep(user)) {
      return res.status(403).json({ message: "Admin accounts log in with password or Google, then enter the code we email you." });
    }
    let isNewUser = false;
    if (!user) {
      user = new User({
        name: email.split("@")[0],
        email,
        password: crypto.randomBytes(20).toString("hex"),
      });
      await user.save();
      isNewUser = true;
      sendWelcomeSafely(email, user.name);
    }

    const token = generateToken(user);
    res.cookie("token", token, cookieOptions);
    res.status(200).json({
      message: "Logged in successfully",
      token,
      isNewUser,
      user: toClientUser(user),
    });
  } catch (error) {
    console.error("OTP verify error:", error.message || error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
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

// ── Get all users (admin only: names, emails, phone numbers, photos) ─────────
// Users have no phone field of their own: the phone comes from their default
// (or first) saved delivery address, otherwise from their most recent order.
const DEFAULT_AVATAR = "pngall.com/wp-content/uploads/5/User-Profile-PNG";
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const Order = require("../orders/ordersmodel");
    const users = await User.find()
      .select("name email role profilePicture bio profession addresses createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const ids = users.map((u) => String(u._id));
    const emails = users.map((u) => u.email);
    const orders = await Order.find({ $or: [{ userId: { $in: ids } }, { email: { $in: emails } }] })
      .select("userId email customerInfo.phone createdAt")
      .sort({ createdAt: -1 })
      .limit(20000)
      .lean();
    const byUser = {};
    for (const o of orders) {
      const key = (o.userId && ids.includes(String(o.userId)) && String(o.userId)) || `email:${o.email}`;
      byUser[key] = byUser[key] || { phone: o.customerInfo?.phone || "", count: 0 };
      byUser[key].count += 1;
    }

    res.status(200).json({
      users: users.map((u) => {
        const addr = (u.addresses || []).find((a) => a.isDefault) || (u.addresses || [])[0];
        const fromOrders = byUser[String(u._id)] || byUser[`email:${u.email}`];
        const phone = addr?.phone || fromOrders?.phone || "";
        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          profilePicture: u.profilePicture && !u.profilePicture.includes(DEFAULT_AVATAR) ? u.profilePicture : "",
          bio: u.bio || "",
          profession: u.profession || "",
          phone,
          phoneSource: addr?.phone ? "address" : fromOrders?.phone ? "order" : "",
          city: [addr?.city, addr?.state].filter(Boolean).join(", "),
          orders: fromOrders?.count || 0,
          createdAt: u.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ message: "Failed to load users" });
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
    if (!EMAIL_RE.test(email)) return res.status(400).send({ message: "Please enter a valid email address" });

    if (tooManyAttempts(`forgot:${req.ip}`, 5, 15 * 60 * 1000)) {
      return res.status(429).send({ message: "Too many requests. Please try again in 15 minutes." });
    }
    recordAttempt(`forgot:${req.ip}`);

    // Same answer whether or not the account exists, so emails can't be probed
    const genericReply = { message: "If an account exists for this email, we've sent a password reset link. Please check your inbox." };
    const user = await findByEmail(email);
    if (!user) return res.status(200).send(genericReply);

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    await sendResetEmail(user.email, resetToken, user.name);

    res.status(200).send(genericReply);
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
    if (String(password || "").length < MIN_PASSWORD) {
      return res.status(400).send({ message: `Password must be at least ${MIN_PASSWORD} characters` });
    }

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