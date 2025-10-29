import { v4 as uuidv4 } from "uuid";
import { localStorageService } from "../services/localStorageService.js";
import { logger } from "../utils/logger.js";

/**
 * EditOperation Model
 * Stores edit operations (EDL - Edit Decision List) for version control
 * Append-only log of all edits per project
 */
export class EditOperation {
  constructor(data = {}) {
    this._id = data._id || uuidv4();
    this.projectId = data.projectId || null;
    this.version = data.version || 1;
    this.ops = data.ops || []; // Array of operations: [{type: 'effect', effect: 'blur', params: {...}}, ...]
    this.userId = data.userId || null;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.projectId) {
      errors.push("Project ID is required");
    }

    if (!this.userId) {
      errors.push("User ID is required");
    }

    if (!this.version || this.version < 1) {
      errors.push("Version must be >= 1");
    }

    if (!Array.isArray(this.ops)) {
      errors.push("ops must be an array");
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
      ops: this.ops,
      userId: this.userId,
      createdAt: this.createdAt,
    };
  }

  // Save to storage (append-only)
  async save() {
    try {
      const validation = this.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      const savedOp = await localStorageService.createEditOperation(
        this.toObject()
      );
      Object.assign(this, savedOp);
      logger.info(
        `Edit operation created: project=${this.projectId}, version=${this.version}`
      );

      return this;
    } catch (error) {
      logger.error("Error saving edit operation:", error);
      throw error;
    }
  }

  // Static methods
  static async create(data) {
    const editOp = new EditOperation(data);
    return await editOp.save();
  }

  static async findById(id) {
    try {
      const data = await localStorageService.findEditOperationById(id);
      return data ? new EditOperation(data) : null;
    } catch (error) {
      logger.error("Error finding edit operation:", error);
      return null;
    }
  }

  static async findByProjectId(projectId) {
    try {
      const operations = await localStorageService.findEditOperationsByProject(
        projectId
      );
      return operations.map((op) => new EditOperation(op));
    } catch (error) {
      logger.error("Error finding edit operations by project:", error);
      return [];
    }
  }

  static async findByProjectIdAndVersion(projectId, version) {
    try {
      const operation =
        await localStorageService.findEditOperationByProjectVersion(
          projectId,
          version
        );
      return operation ? new EditOperation(operation) : null;
    } catch (error) {
      logger.error("Error finding edit operation by version:", error);
      return null;
    }
  }

  static async getLatestVersion(projectId) {
    try {
      const operations = await EditOperation.findByProjectId(projectId);
      if (operations.length === 0) return 0;

      return Math.max(...operations.map((op) => op.version));
    } catch (error) {
      logger.error("Error getting latest version:", error);
      return 0;
    }
  }

  static async getAllOperationsUpToVersion(projectId, targetVersion) {
    try {
      const operations = await EditOperation.findByProjectId(projectId);
      return operations
        .filter((op) => op.version <= targetVersion)
        .sort((a, b) => a.version - b.version);
    } catch (error) {
      logger.error("Error getting operations up to version:", error);
      return [];
    }
  }
}
