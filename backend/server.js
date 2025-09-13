// Load environment variables first
import dotenv from "dotenv";
import "dotenv/config";
dotenv.config();
console.log("[BOOT] USE_LOCAL_STORAGE =", process.env.USE_LOCAL_STORAGE);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { localStorageService } from "./src/services/localStorageService.js";

// Import routes
import authRoutes from "./src/routes/auth.js";
import videoRoutes from "./src/routes/video.js";
import aiRoutes from "./src/routes/ai.js";
import userRoutes from "./src/routes/user.js";
import testRoutes from "./src/routes/test.js";
import projectRoutes from "./src/routes/project.js";

// Import middleware
import { errorHandler } from "./src/middleware/errorHandler.js";
import { rateLimiter } from "./src/middleware/rateLimiter.js";
import { logger } from "./src/utils/logger.js";

// Import socket handlers
import { setupSocketHandlers } from "./src/sockets/chatSocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Rate limiting
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static files
app.use("/uploads", express.static(join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/test", testRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.post("/api/test/echo", (req, res) => {
  res.json({ received: req.body });
});

// Setup Socket.IO for real-time chat
setupSocketHandlers(io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Database connection (Local Storage)
const connectDB = async () => {
  try {
    if (process.env.USE_LOCAL_STORAGE === "true") {
      await localStorageService.init();
      logger.info("Local Storage initialized successfully");
    } else {
      // For future MongoDB connection when going live
      logger.warn(
        "MongoDB connection not implemented yet. Using local storage."
      );
      await localStorageService.init();
    }
  } catch (error) {
    logger.error("Database initialization failed:", error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      logger.info(`🚀 VFXB Backend Server running on port ${PORT}`);
      logger.info(
        `📱 Frontend URL: ${
          process.env.FRONTEND_URL || "http://localhost:4000"
        }`
      );
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    // Graceful shutdown for local storage
    if (process.env.USE_LOCAL_STORAGE === "true") {
      logger.info("Local storage service shutdown complete");
    }
    process.exit(0);
  });
});

startServer();

export { io };
