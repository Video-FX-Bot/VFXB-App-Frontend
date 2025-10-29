import crypto from "crypto";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import { logger } from "../utils/logger.js";

/**
 * Compute SHA256 hash of a file
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} - SHA256 hex digest
 */
export async function computeFileSHA256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("data", (data) => {
      hash.update(data);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Check if file already exists by SHA256 hash
 * Returns existing video if found, null otherwise
 */
export async function findDuplicateVideo(sha256, localStorageService) {
  try {
    const existingVideo = await localStorageService.findVideoByHash(sha256);
    return existingVideo;
  } catch (error) {
    logger.error("Error checking for duplicate video:", error);
    return null;
  }
}

/**
 * Deduplicate uploaded file
 * If duplicate exists, delete new upload and return existing video
 * Otherwise return null
 */
export async function deduplicateUpload(filePath, sha256, localStorageService) {
  try {
    const existing = await findDuplicateVideo(sha256, localStorageService);

    if (existing) {
      // Duplicate found - delete the newly uploaded file
      try {
        await fs.unlink(filePath);
        logger.info(
          `Deleted duplicate upload: ${filePath}, using existing video: ${existing._id}`
        );
      } catch (unlinkError) {
        logger.warn(
          `Failed to delete duplicate file: ${filePath}`,
          unlinkError
        );
      }

      // Increment reference count
      await localStorageService.incrementVideoRefCount(existing._id);

      return existing;
    }

    return null;
  } catch (error) {
    logger.error("Error deduplicating upload:", error);
    return null;
  }
}
