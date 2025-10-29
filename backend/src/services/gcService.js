import { promises as fs } from "fs";
import path from "path";
import { ExportVersion } from "../models/ExportVersion.js";
import { Project } from "../models/Project.js";
import { Video } from "../models/Video.js";
import { logger } from "../utils/logger.js";
import localStorageService from "../services/localStorageService.js";

/**
 * Garbage Collection Service
 * Marks old export versions as GC candidates
 * Does NOT automatically delete - requires explicit admin action
 */
export class GCService {
  /**
   * Calculate and mark GC candidates based on TTL and pin status
   * Does NOT delete - only marks for review
   *
   * @param {object} options - GC options
   * @param {number} options.ttlDays - Time to live in days (default: 30)
   * @param {number} options.keepLatestN - Keep latest N versions per project (default: 3)
   * @returns {Promise<object>} - Report of candidates marked
   */
  static async calcGCCandidates(options = {}) {
    const { ttlDays = 30, keepLatestN = 3 } = options;

    logger.info(
      `Calculating GC candidates: TTL=${ttlDays} days, keep latest ${keepLatestN}`
    );

    try {
      const projects = await localStorageService.readCollection("projects");
      const report = {
        totalProjects: projects.length,
        projectsProcessed: 0,
        candidatesMarked: 0,
        candidatesAlreadyMarked: 0,
        exportsPinned: 0,
        exportsKept: 0,
        errors: [],
        candidates: [],
      };

      for (const project of projects) {
        try {
          const marked = await ExportVersion.markOldVersionsForGC(
            project._id,
            keepLatestN,
            ttlDays
          );

          const exports = await ExportVersion.findByProjectId(project._id);
          const pinnedCount = exports.filter((exp) => exp.pinned).length;
          const keptCount = exports.filter((exp) => !exp.gcCandidate).length;

          report.projectsProcessed++;
          report.candidatesMarked += marked.filter(
            (m) => !m.gcCandidate
          ).length;
          report.candidatesAlreadyMarked += marked.filter(
            (m) => m.gcCandidate
          ).length;
          report.exportsPinned += pinnedCount;
          report.exportsKept += keptCount;

          // Add to detailed candidates list
          for (const exp of marked) {
            report.candidates.push({
              projectId: project._id,
              projectName: project.name,
              version: exp.version,
              exportId: exp._id,
              filePath: exp.filePath,
              size: exp.size,
              createdAt: exp.createdAt,
              gcMarkedAt: exp.gcMarkedAt,
            });
          }
        } catch (error) {
          logger.error(`Error processing project ${project._id}:`, error);
          report.errors.push({
            projectId: project._id,
            error: error.message,
          });
        }
      }

      logger.info(`GC candidates calculation complete:`, report);
      return report;
    } catch (error) {
      logger.error("Error calculating GC candidates:", error);
      throw error;
    }
  }

  /**
   * Get all current GC candidates
   * @param {number} olderThanDays - Only show candidates older than N days
   * @returns {Promise<Array>} - List of GC candidates
   */
  static async getGCCandidates(olderThanDays = 0) {
    try {
      const candidates = await ExportVersion.findGCCandidates(olderThanDays);

      // Enrich with project info
      const enriched = [];
      for (const exp of candidates) {
        const project = await Project.findById(exp.projectId);
        enriched.push({
          exportId: exp._id,
          projectId: exp.projectId,
          projectName: project?.name || "Unknown",
          version: exp.version,
          filePath: exp.filePath,
          size: exp.size,
          resolution: exp.resolution,
          duration: exp.duration,
          createdAt: exp.createdAt,
          gcMarkedAt: exp.gcMarkedAt,
        });
      }

      return enriched;
    } catch (error) {
      logger.error("Error getting GC candidates:", error);
      throw error;
    }
  }

  /**
   * Archive (soft delete) GC candidates
   * Moves files to archive directory but doesn't delete
   *
   * @param {Array<string>} exportIds - Array of export IDs to archive
   * @returns {Promise<object>} - Archive report
   */
  static async archiveCandidates(exportIds) {
    logger.info(`Archiving ${exportIds.length} exports`);

    const UPLOAD_PATH = process.env.UPLOAD_PATH || "./uploads";
    const archiveDir = path.join(UPLOAD_PATH, "archive");
    await fs.mkdir(archiveDir, { recursive: true });

    const report = {
      totalRequested: exportIds.length,
      archived: 0,
      failed: 0,
      errors: [],
      archivedExports: [],
    };

    for (const exportId of exportIds) {
      try {
        const exportVersion = await ExportVersion.findById(exportId);

        if (!exportVersion) {
          report.errors.push({
            exportId,
            error: "Export not found",
          });
          report.failed++;
          continue;
        }

        if (exportVersion.pinned) {
          report.errors.push({
            exportId,
            error: "Export is pinned, cannot archive",
          });
          report.failed++;
          continue;
        }

        // Move file to archive
        const originalPath = exportVersion.filePath;
        const filename = path.basename(originalPath);
        const archivePath = path.join(archiveDir, `${exportId}_${filename}`);

        try {
          await fs.rename(originalPath, archivePath);
        } catch (err) {
          // File might not exist, that's ok
          logger.warn(`Could not move file to archive: ${originalPath}`, err);
        }

        // Update export record
        exportVersion.filePath = archivePath;
        exportVersion.s3Key = `archive/${exportId}_${filename}`;
        await exportVersion.save();

        report.archived++;
        report.archivedExports.push({
          exportId,
          projectId: exportVersion.projectId,
          version: exportVersion.version,
          archivedPath: archivePath,
        });

        logger.info(`Archived export: ${exportId}`);
      } catch (error) {
        logger.error(`Failed to archive export ${exportId}:`, error);
        report.errors.push({
          exportId,
          error: error.message,
        });
        report.failed++;
      }
    }

    logger.info(`Archive complete:`, report);
    return report;
  }

  /**
   * Permanently delete archived exports
   * DANGEROUS - requires explicit confirmation
   *
   * @param {Array<string>} exportIds - Array of export IDs to delete
   * @param {boolean} confirmed - Must be true to proceed
   * @returns {Promise<object>} - Deletion report
   */
  static async deleteArchivedExports(exportIds, confirmed = false) {
    if (!confirmed) {
      throw new Error("Deletion not confirmed. Set confirmed=true to proceed.");
    }

    logger.warn(`⚠️ PERMANENTLY DELETING ${exportIds.length} exports`);

    const report = {
      totalRequested: exportIds.length,
      deleted: 0,
      failed: 0,
      spaceSaved: 0,
      errors: [],
    };

    for (const exportId of exportIds) {
      try {
        const exportVersion = await ExportVersion.findById(exportId);

        if (!exportVersion) {
          report.errors.push({
            exportId,
            error: "Export not found",
          });
          report.failed++;
          continue;
        }

        if (exportVersion.pinned) {
          report.errors.push({
            exportId,
            error: "Export is pinned, cannot delete",
          });
          report.failed++;
          continue;
        }

        // Delete physical file
        try {
          const stats = await fs.stat(exportVersion.filePath);
          await fs.unlink(exportVersion.filePath);
          report.spaceSaved += stats.size;
        } catch (err) {
          logger.warn(`Could not delete file: ${exportVersion.filePath}`, err);
        }

        // Delete database record
        await localStorageService.deleteExportVersion(exportId);

        report.deleted++;
        logger.info(`Deleted export: ${exportId}`);
      } catch (error) {
        logger.error(`Failed to delete export ${exportId}:`, error);
        report.errors.push({
          exportId,
          error: error.message,
        });
        report.failed++;
      }
    }

    logger.warn(`⚠️ Deletion complete:`, report);
    return report;
  }

  /**
   * Clean up unused source videos (refCount = 0)
   * Does NOT delete - only reports
   */
  static async findUnusedVideos() {
    try {
      const videos = await localStorageService.readCollection("videos");
      const unused = videos.filter((v) => (v.refCount || 1) <= 0);

      return unused.map((v) => ({
        videoId: v._id,
        title: v.title,
        filePath: v.filePath,
        size: v.fileSize,
        refCount: v.refCount,
        createdAt: v.createdAt,
      }));
    } catch (error) {
      logger.error("Error finding unused videos:", error);
      throw error;
    }
  }
}

export default GCService;
