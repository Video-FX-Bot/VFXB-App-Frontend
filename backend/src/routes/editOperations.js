import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { EditOperation } from "../models/EditOperation.js";
import { ExportVersion } from "../models/ExportVersion.js";
import { Project } from "../models/Project.js";
import { logger } from "../utils/logger.js";
import {
  enqueueProxyRender,
  enqueueExportRender,
} from "../workers/renderQueue.js";

const router = express.Router();

/**
 * @route   POST /api/projects/:projectId/ops
 * @desc    Append edit operations and bump project version
 * @access  Private
 */
router.post("/:projectId/ops", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { ops } = req.body; // Array of operations

    if (!ops || !Array.isArray(ops) || ops.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ops array is required and must not be empty",
      });
    }

    // Find project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Verify ownership
    if (project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to edit this project",
      });
    }

    // Atomic version bump
    const newVersion = project.currentVersion + 1;

    // Create edit operation record (append-only)
    const editOp = await EditOperation.create({
      projectId: projectId,
      version: newVersion,
      ops: ops,
      userId: req.user.id,
    });

    // Update project current version
    project.currentVersion = newVersion;
    await project.save();

    // Enqueue proxy render job
    const jobId = await enqueueProxyRender(projectId, newVersion);

    logger.info(
      `Edit operation created: project=${projectId}, version=${newVersion}, job=${jobId}`
    );

    res.status(201).json({
      success: true,
      message: "Edit operations saved",
      data: {
        projectId: projectId,
        version: newVersion,
        operationId: editOp._id,
        jobId: jobId,
        ops: editOp.ops,
      },
    });
  } catch (error) {
    logger.error("Error creating edit operation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save edit operations",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/projects/:projectId/ops
 * @desc    Get all edit operations for a project
 * @access  Private
 */
router.get("/:projectId/ops", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { version } = req.query; // Optional: get ops up to specific version

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this project",
      });
    }

    let operations;
    if (version) {
      operations = await EditOperation.getAllOperationsUpToVersion(
        projectId,
        parseInt(version)
      );
    } else {
      operations = await EditOperation.findByProjectId(projectId);
    }

    res.status(200).json({
      success: true,
      data: {
        projectId: projectId,
        currentVersion: project.currentVersion,
        operations: operations.map((op) => ({
          id: op._id,
          version: op.version,
          ops: op.ops,
          createdAt: op.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error("Error fetching edit operations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch edit operations",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/projects/:projectId/export
 * @desc    Enqueue high-resolution export render
 * @access  Private
 */
router.post("/:projectId/export", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { version, resolution, format } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to export this project",
      });
    }

    // Use specified version or current version
    const exportVersion = version || project.currentVersion;

    if (exportVersion < 1 || exportVersion > project.currentVersion) {
      return res.status(400).json({
        success: false,
        message: `Invalid version. Must be between 1 and ${project.currentVersion}`,
      });
    }

    // Check if this version is already exported
    const existingExport = await ExportVersion.findByProjectIdAndVersion(
      projectId,
      exportVersion
    );
    if (existingExport) {
      return res.status(200).json({
        success: true,
        message: "Export already exists",
        data: {
          projectId: projectId,
          version: exportVersion,
          exportId: existingExport._id,
          filePath: existingExport.filePath,
          existing: true,
        },
      });
    }

    // Enqueue export render job
    const jobId = await enqueueExportRender(projectId, exportVersion, {
      resolution: resolution || "1920x1080",
      format: format || "mp4",
    });

    logger.info(
      `Export enqueued: project=${projectId}, version=${exportVersion}, job=${jobId}`
    );

    res.status(202).json({
      success: true,
      message: "Export job enqueued",
      data: {
        projectId: projectId,
        version: exportVersion,
        jobId: jobId,
        status: "pending",
      },
    });
  } catch (error) {
    logger.error("Error enqueueing export:", error);
    res.status(500).json({
      success: false,
      message: "Failed to enqueue export",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/projects/:projectId/exports
 * @desc    Get all export versions for a project
 * @access  Private
 */
router.get("/:projectId/exports", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (project.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this project",
      });
    }

    const exports = await ExportVersion.findByProjectId(projectId);

    res.status(200).json({
      success: true,
      data: {
        projectId: projectId,
        latestExportKey: project.latestExportKey,
        exports: exports.map((exp) => ({
          id: exp._id,
          version: exp.version,
          filePath: exp.filePath,
          size: exp.size,
          resolution: exp.resolution,
          duration: exp.duration,
          format: exp.format,
          pinned: exp.pinned,
          gcCandidate: exp.gcCandidate,
          createdAt: exp.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error("Error fetching exports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exports",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/projects/:projectId/versions/:version/pin
 * @desc    Toggle pin status on an export version
 * @access  Private
 */
router.post(
  "/:projectId/versions/:version/pin",
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId, version } = req.params;

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to pin this export",
        });
      }

      const exportVersion = await ExportVersion.findByProjectIdAndVersion(
        projectId,
        parseInt(version)
      );
      if (!exportVersion) {
        return res.status(404).json({
          success: false,
          message: "Export version not found",
        });
      }

      // Toggle pin
      await exportVersion.togglePin();

      logger.info(
        `Export ${
          exportVersion.pinned ? "pinned" : "unpinned"
        }: project=${projectId}, version=${version}`
      );

      res.status(200).json({
        success: true,
        message: exportVersion.pinned
          ? "Export pinned successfully"
          : "Export unpinned successfully",
        data: {
          projectId: projectId,
          version: parseInt(version),
          pinned: exportVersion.pinned,
        },
      });
    } catch (error) {
      logger.error("Error toggling pin:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle pin",
        error: error.message,
      });
    }
  }
);

export default router;
