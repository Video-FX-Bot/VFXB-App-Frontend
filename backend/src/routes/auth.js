import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { readUsers, writeUsers } from "../services/fileStore.js";
import { User } from "../models/User.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { sendEmail } from "../utils/email.js";
import { localStorageService } from "../services/localStorageService.js";

const useLocal = process.env.USE_LOCAL_STORAGE === "true";
const router = express.Router();
const USE_LS = process.env.USE_LOCAL_STORAGE === "true";

/* ----------------------------- Rate Limiting ----------------------------- */

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  skip: () => process.env.NODE_ENV === "development",
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

/* -------------------------------- Helpers -------------------------------- */

const isEmail = (s) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

function validateRegisterPayload({
  username,
  email,
  password,
  firstName,
  lastName,
}) {
  const errors = {};
  if (!username || typeof username !== "string")
    errors.username = "Username is required";
  else {
    const u = username.trim();
    if (u.length < 3)
      errors.username = "Username must be at least 3 characters";
    else if (u.length > 30)
      errors.username = "Username must be at most 30 characters";
    else if (!/^[a-zA-Z0-9_-]+$/.test(u))
      errors.username =
        "Username may contain letters, numbers, underscores, and hyphens only";
  }
  if (!email || typeof email !== "string" || !isEmail(email))
    errors.email = "A valid email is required";
  if (!password || typeof password !== "string" || password.length < 8)
    errors.password = "Password must be at least 8 characters long";
  if (firstName && String(firstName).length > 50)
    errors.firstName = "First name must be at most 50 characters";
  if (lastName && String(lastName).length > 50)
    errors.lastName = "Last name must be at most 50 characters";
  return { isValid: Object.keys(errors).length === 0, errors };
}

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId, type: "access" },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    }
  );
  const refreshToken = jwt.sign(
    { userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
  return { accessToken, refreshToken };
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// ---------- Local Storage helpers (DEV) ----------
async function lsGetUsers() {
  return await readUsers();
}
async function lsSetUsers(users) {
  await writeUsers(users);
}
const safeId = (u) =>
  u?._id || u?.id || String(u?.email || u?.username || Date.now());
async function lsFindByEmailOrUsername(identifier) {
  const id = String(identifier || "").toLowerCase();
  const users = await lsGetUsers();
  return users.find(
    (u) =>
      String(u.email || "").toLowerCase() === id ||
      String(u.username || "").toLowerCase() === id
  );
}
async function lsFindById(id) {
  const users = await lsGetUsers();
  return users.find((u) => (u._id || u.id) === id);
}

// ---------- DB helpers (when you flip to Mongo) ----------
async function dbFindByEmailOrUsername(identifier) {
  const id = String(identifier || "").toLowerCase();
  return User.findOne({ $or: [{ email: id }, { username: id }] });
}

/* --------------------------------- Routes -------------------------------- */

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: {
          ...(username ? {} : { username: "Username is required" }),
          ...(email ? {} : { email: "Email is required" }),
          ...(password ? {} : { password: "Password is required" }),
        },
      });
    }

    const users = await lsGetUsers();
    const exists = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = {
      id: crypto.randomUUID?.() || String(Date.now()),
      username,
      name: name || username,
      email,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await lsSetUsers(users);

    return res.status(201).json({
      success: true,
      data: { user: { id: newUser.id, username, name: newUser.name, email } },
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Registration failed" });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });
    }

    const users = await lsGetUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post("/refresh", generalLimiter, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken)
      return res
        .status(401)
        .json({ success: false, message: "Refresh token required" });

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
    if (decoded.type !== "refresh") {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token type" });
    }

    let userId = decoded.userId;
    if (USE_LS) {
      const user = await lsFindById(userId);
      if (!user)
        return res
          .status(401)
          .json({ success: false, message: "User not found or inactive" });
    } else {
      const user = await User.findById(userId);
      if (!user || user.isActive === false) {
        return res
          .status(401)
          .json({ success: false, message: "User not found or inactive" });
      }
    }

    const { accessToken, refreshToken: newRefreshToken } =
      generateTokens(userId);
    setTokenCookies(res, accessToken, newRefreshToken);

    return res.json({
      success: true,
      message: "Token refreshed successfully",
      data: { tokens: { accessToken, refreshToken: newRefreshToken } },
    });
  } catch (error) {
    logger.error("Token refresh error:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Token refresh failed" });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", optionalAuth, (req, res) => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    if (req.user)
      logger.info(`User logged out: ${req.user.email || req.user.id}`);
    return res.json({ success: true, message: "Logout successful" });
  } catch (error) {
    logger.error("Logout error:", error);
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    let user;
    if (USE_LS) {
      user = await lsFindById(req.user.id);
    } else {
      user = await User.findById(req.user.id)
        .select("-password")
        .populate("subscription");
    }
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.json({
      success: true,
      data: {
        user: {
          id: user._id || user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          analytics: user.analytics,
        },
      },
    });
  } catch (error) {
    logger.error("Get current user error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get user information" });
  }
});

export default router;
