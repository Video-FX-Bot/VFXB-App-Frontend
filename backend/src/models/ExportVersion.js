import { v4 as uuidv4 } from "uuid";
import { localStorageService } from "../services/localStorageService.js";
import { logger } from "../utils/logger.js";

/**
 * ExportVersion Model
 * Tracks high-resolution export versions of a project
 * Supports pinning to prevent garbage collection
 */
export class ExportVersion {
  constructor(data = {}) {
    this._id = data._id || uuidv4();
    this.projectId = data.projectId || null;
    this.version = data.version || 1;
    this.s3Key = data.s3Key || null; // File path/key (in uploads/export/ for local storage)
    this.filePath = data.filePath || null; // Alias for s3Key for local storage
    this.size = data.size || 0; // File size in bytes
    this.pinned = data.pinned !== undefined ? data.pinned : false;
    this.resolution = data.resolution || null; // e.g., "1920x1080"
    this.duration = data.duration || null; // Duration in seconds
    this.format = data.format || "mp4";
    this.gcCandidate = data.gcCandidate || false; // Marked for garbage collection
    this.gcMarkedAt = data.gcMarkedAt || null; // When marked for GC
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.projectId) {
      errors.push("Project ID is required");
    }

    if (!this.version || this.version < 1) {
      errors.push("Version must be >= 1");
    }

    if (!this.s3Key && !this.filePath) {
      errors.push("s3Key or filePath is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Convert to plain object
  toObject() {
    return {
      _id: this._id,
      projectId: this.projectId,
      version: this.version,
      s3Key: this.s3Key,
      filePath: this.filePath || this.s3Key,
      size: this.size,
      pinned: this.pinned,
      resolution: this.resolution,
      duration: this.duration,
      format: this.format,
      gcCandidate: this.gcCandidate,
      gcMarkedAt: this.gcMarkedAt,
      createdAt: this.createdAt,
    };
  }

  // Save to storage
  async save() {
    try {
      const validation = this.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Ensure filePath is set
      if (!this.filePath && this.s3Key) {
        this.filePath = this.s3Key;
      }

      if (this._id && (await ExportVersion.findById(this._id))) {
        // Update existing
        const updated = await localStorageService.updateExportVersion(
          this._id,
          this.toObject()
        );
        Object.assign(this, updated);
        logger.info(`Export version updated: ${this._id}`);
      } else {
        // Create new
        const saved = await localStorageService.createExportVersion(
          this.toObject()
        );
        Object.assign(this, saved);
        logger.info(
          `Export version created: project=${this.projectId}, version=${this.version}`
        );
      }

      return this;
    } catch (error) {
      logger.error("Error saving export version:", error);
      throw error;
    }
  }

  // Pin/unpin export
  async togglePin() {
    this.pinned = !this.pinned;
    if (this.pinned) {
      // If pinning, remove GC candidate flag
      this.gcCandidate = false;
      this.gcMarkedAt = null;
    }
    return await this.save();
  }

  // Mark as GC candidate
  async markForGC() {
    if (this.pinned) {
      throw new Error("Cannot mark pinned export for garbage collection");
    }
    this.gcCandidate = true;
    this.gcMarkedAt = new Date().toISOString();
    return await this.save();
  }

  // Unmark GC candidate
  async unmarkForGC() {
    this.gcCandidate = false;
    this.gcMarkedAt = null;
    return await this.save();
  }

  // Static methods
  static async create(data) {
    const exportVersion = new ExportVersion(data);
    return await exportVersion.save();
  }

  static async findById(id) {
    try {
      const data = await localStorageService.findExportVersionById(id);
      return data ? new ExportVersion(data) : null;
    } catch (error) {
      logger.error("Error finding export version:", error);
      return null;
    }
  }

  static async findByProjectId(projectId) {
    try {
      const exports = await localStorageService.findExportVersionsByProject(
        projectId
      );
      return exports.map((exp) => new ExportVersion(exp));
    } catch (error) {
      logger.error("Error finding export versions by project:", error);
      return [];
    }
  }

  static async findByProjectIdAndVersion(projectId, version) {
    try {
      const exportVer =
        await localStorageService.findExportVersionByProjectVersion(
          projectId,
          version
        );
      return exportVer ? new ExportVersion(exportVer) : null;
    } catch (error) {
      logger.error("Error finding export version:", error);
      return null;
    }
  }

  static async findGCCandidates(olderThanDays = 30) {
    try {
      const allExports = await localStorageService.readCollection(
        "exportVersions"
      );
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      return allExports
        .filter(
          (exp) =>
            !exp.pinned &&
            exp.gcCandidate &&
            exp.gcMarkedAt &&
            new Date(exp.gcMarkedAt) < cutoffDate
        )
        .map((exp) => new ExportVersion(exp));
    } catch (error) {
      logger.error("Error finding GC candidates:", error);
      return [];
    }
  }

  static async markOldVersionsForGC(projectId, keepLatestN = 3, ttlDays = 30) {
    try {
      const exports = await ExportVersion.findByProjectId(projectId);

      // Sort by version descending
      const sorted = exports.sort((a, b) => b.version - a.version);

      // Keep latest N versions and all pinned versions
      const toMark = sorted.slice(keepLatestN).filter((exp) => !exp.pinned);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ttlDays);

      const marked = [];
      for (const exp of toMark) {
        if (new Date(exp.createdAt) < cutoffDate) {
          await exp.markForGC();
          marked.push(exp);
        }
      }

      logger.info(
        `Marked ${marked.length} exports for GC in project ${projectId}`
      );
      return marked;
    } catch (error) {
      logger.error("Error marking old versions for GC:", error);
      return [];
    }
  }
}
