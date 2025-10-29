import express from "express";
import { authenticateToken } from "../../middleware/auth.js";
import GCService from "../../services/gcService.js";
import { logger } from "../../utils/logger.js";

const router = express.Router();

/**
 * Middleware to check admin role
 * In production, implement proper role-based access control
 */
const requireAdmin = (req, res, next) => {
  // TODO: Implement proper admin check
  // For now, check if user has admin flag or is in admin list
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

/**
 * @route   POST /api/admin/gc/calculate
 * @desc    Calculate GC candidates (mark old exports)
 * @access  Admin only
 */
router.post("/calculate", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ttlDays, keepLatestN } = req.body;

    const report = await GCService.calcGCCandidates({
      ttlDays: ttlDays || 30,
      keepLatestN: keepLatestN || 3,
    });

    res.status(200).json({
      success: true,
      message: "GC candidates calculated",
      data: report,
    });
  } catch (error) {
    logger.error("Error calculating GC candidates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate GC candidates",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/gc/candidates
 * @desc    Get list of current GC candidates
 * @access  Admin only
 */
router.get("/candidates", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { olderThanDays } = req.query;

    const candidates = await GCService.getGCCandidates(
      olderThanDays ? parseInt(olderThanDays) : 0
    );

    const totalSize = candidates.reduce((sum, c) => sum + (c.size || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        count: candidates.length,
        totalSize: totalSize,
        totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
        candidates: candidates,
      },
    });
  } catch (error) {
    logger.error("Error getting GC candidates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get GC candidates",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/admin/gc/archive
 * @desc    Archive selected export versions (soft delete)
 * @access  Admin only
 */
router.post("/archive", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { exportIds } = req.body;

    if (!exportIds || !Array.isArray(exportIds) || exportIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "exportIds array is required",
      });
    }

    const report = await GCService.archiveCandidates(exportIds);

    res.status(200).json({
      success: true,
      message: `Archived ${report.archived} exports`,
      data: report,
    });
  } catch (error) {
    logger.error("Error archiving exports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive exports",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/admin/gc/delete
 * @desc    Permanently delete archived exports
 * @access  Admin only
 * @warning DANGEROUS - Permanently deletes files
 */
router.post("/delete", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { exportIds, confirmed } = req.body;

    if (!exportIds || !Array.isArray(exportIds) || exportIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "exportIds array is required",
      });
    }

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        message: "Must set confirmed=true to proceed with deletion",
      });
    }

    const report = await GCService.deleteArchivedExports(exportIds, confirmed);

    res.status(200).json({
      success: true,
      message: `Deleted ${report.deleted} exports, saved ${Math.round(
        report.spaceSaved / (1024 * 1024)
      )} MB`,
      data: report,
    });
  } catch (error) {
    logger.error("Error deleting exports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete exports",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/gc/unused-videos
 * @desc    Find unused source videos (refCount = 0)
 * @access  Admin only
 */
router.get(
  "/unused-videos",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const unused = await GCService.findUnusedVideos();

      const totalSize = unused.reduce((sum, v) => sum + (v.size || 0), 0);

      res.status(200).json({
        success: true,
        data: {
          count: unused.length,
          totalSize: totalSize,
          totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
          videos: unused,
        },
      });
    } catch (error) {
      logger.error("Error finding unused videos:", error);
      res.status(500).json({
        success: false,
        message: "Failed to find unused videos",
        error: error.message,
      });
    }
  }
);

export default router;
