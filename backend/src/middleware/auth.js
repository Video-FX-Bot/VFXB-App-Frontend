import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";
import { readUsers } from "../services/fileStore.js"; // <-- for demo/file mode
import { User } from "../models/User.js"; // <-- for mongo mode

const isFileMode = (process.env.AUTH_BACKEND || "").toLowerCase() === "file";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access token required" });
    }

    // Dev-only demo tokens are still supported if you want
    if (
      process.env.NODE_ENV === "development" &&
      token.startsWith("demo-token-")
    ) {
      req.user = {
        id: "demo-user-id",
        username: "demo-user",
        email: "demo@example.com",
        isActive: true,
        role: "user",
      };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const userId = decoded.sub || decoded.userId || decoded.id; // <-- accept 'sub'

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token payload" });
    }

    let user;

    if (isFileMode) {
      // File-store (demo)
      const users = await readUsers();
      user = users.find((u) => u.id === userId);
      if (!user)
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      const { password, passwordHash, ...safe } = user;
      req.user = { ...safe, id: safe.id || safe._id }; // normalize id
    } else {
      // Mongo/Mongoose (prod)
      user = await User.findById(userId)
        .select("-password -passwordHash -__v")
        .lean();
      if (!user)
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      if (user.isActive === false) {
        return res
          .status(401)
          .json({ success: false, message: "Account is deactivated" });
      }
      req.user = { ...user, id: user._id?.toString?.() || user.id };
    }

    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Authentication failed" });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const userId = decoded.sub || decoded.userId || decoded.id;

    if (isFileMode) {
      const users = await readUsers();
      const user = users.find((u) => u.id === userId);
      if (user && user.isActive !== false) {
        const { password, passwordHash, ...safe } = user;
        req.user = { ...safe, id: safe.id || safe._id };
      }
    } else {
      const user = await User.findById(userId)
        .select("-password -passwordHash -__v")
        .lean();
      if (user && user.isActive !== false) {
        req.user = { ...user, id: user._id?.toString?.() || user.id };
      }
    }

    next();
  } catch (error) {
    logger.warn("Optional auth failed:", error.message);
    next();
  }
};

// Check if user has required role
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRoles = Array.isArray(req.user.role)
      ? req.user.role
      : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Check if user is admin
export const requireAdmin = requireRole(["admin", "super_admin"]);

// Check if user is premium subscriber
export const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!req.user.subscription || req.user.subscription.status !== "active") {
    return res.status(403).json({
      success: false,
      message: "Premium subscription required",
    });
  }

  if (
    req.user.subscription.expiresAt &&
    new Date() > req.user.subscription.expiresAt
  ) {
    return res.status(403).json({
      success: false,
      message: "Subscription expired",
    });
  }

  next();
};

// Rate limiting per user
export const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(userId)) {
      const userRequests = requests
        .get(userId)
        .filter((time) => time > windowStart);
      requests.set(userId, userRequests);
    }

    const userRequests = requests.get(userId) || [];

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    userRequests.push(now);
    requests.set(userId, userRequests);

    next();
  };
};

// Socket authentication middleware
export const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user || !user.isActive) {
      return next(new Error("User not found or inactive"));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.error("Socket authentication error:", error);
    next(new Error("Authentication failed"));
  }
};

// Validate API key for external integrations
export const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API key required",
      });
    }

    // Find user by API key
    const user = await User.findOne({
      "apiKeys.key": apiKey,
      "apiKeys.isActive": true,
    }).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    // Update last used timestamp
    await User.updateOne(
      { _id: user._id, "apiKeys.key": apiKey },
      { $set: { "apiKeys.$.lastUsed": new Date() } }
    );

    req.user = user;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    logger.error("API key validation error:", error);
    return res.status(500).json({
      success: false,
      message: "API key validation failed",
    });
  }
};

// Check subscription limits
export const checkSubscriptionLimits = (feature) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const user = req.user;
      const subscription = user.subscription;

      // Free tier limits
      const limits = {
        free: {
          videosPerMonth: 5,
          maxVideoSize: 100 * 1024 * 1024, // 100MB
          maxVideoDuration: 300, // 5 minutes
          aiRequestsPerDay: 10,
        },
        premium: {
          videosPerMonth: 100,
          maxVideoSize: 1024 * 1024 * 1024, // 1GB
          maxVideoDuration: 3600, // 1 hour
          aiRequestsPerDay: 1000,
        },
        pro: {
          videosPerMonth: -1, // unlimited
          maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
          maxVideoDuration: -1, // unlimited
          aiRequestsPerDay: -1, // unlimited
        },
      };

      const userTier = subscription?.tier || "free";
      const userLimits = limits[userTier] || limits.free;

      // Check specific feature limits
      if (feature === "video_upload") {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyUploads = user.usage?.videosThisMonth || 0;

        if (
          userLimits.videosPerMonth !== -1 &&
          monthlyUploads >= userLimits.videosPerMonth
        ) {
          return res.status(403).json({
            success: false,
            message: "Monthly video upload limit exceeded",
            limit: userLimits.videosPerMonth,
            used: monthlyUploads,
          });
        }
      }

      if (feature === "ai_request") {
        const today = new Date().toDateString();
        const dailyRequests = user.usage?.aiRequestsToday || 0;

        if (
          userLimits.aiRequestsPerDay !== -1 &&
          dailyRequests >= userLimits.aiRequestsPerDay
        ) {
          return res.status(403).json({
            success: false,
            message: "Daily AI request limit exceeded",
            limit: userLimits.aiRequestsPerDay,
            used: dailyRequests,
          });
        }
      }

      req.userLimits = userLimits;
      next();
    } catch (error) {
      logger.error("Subscription limit check error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check subscription limits",
      });
    }
  };
};

// Middleware to log user activity
export const logActivity = (action) => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        // Log user activity (you can implement this based on your needs)
        logger.info(`User activity: ${req.user.id} - ${action}`, {
          userId: req.user.id,
          action,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          timestamp: new Date(),
        });
      }
      next();
    } catch (error) {
      logger.error("Activity logging error:", error);
      next(); // Continue even if logging fails
    }
  };
};

export default {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requirePremium,
  userRateLimit,
  socketAuth,
  validateApiKey,
  checkSubscriptionLimits,
  logActivity,
};
