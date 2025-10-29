import path from "path";
import { promises as fs } from "fs";
import { EditOperation } from "../models/EditOperation.js";
import { ExportVersion } from "../models/ExportVersion.js";
import { Project } from "../models/Project.js";
import { Video } from "../models/Video.js";
import { VideoProcessor } from "../services/videoProcessor.js";
import { logger } from "../utils/logger.js";
import { computeFileSHA256 } from "../utils/fileUtils.js";

const UPLOAD_PATH = process.env.UPLOAD_PATH || "./uploads";

/**
 * Render low-resolution proxy from edit operations
 * Idempotent: skips if proxy already exists with matching checksum
 *
 * @param {string} projectId - Project ID
 * @param {number} version - Version number
 * @returns {Promise<object>} - Render result with proxy path
 */
export async function renderProxy(projectId, version) {
  logger.info(
    `Starting proxy render: project=${projectId}, version=${version}`
  );

  try {
    // Get project
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Define proxy output path
    const proxyDir = path.join(UPLOAD_PATH, "proxy", projectId);
    await fs.mkdir(proxyDir, { recursive: true });

    const proxyFilename = `v${version}_proxy.mp4`;
    const proxyPath = path.join(proxyDir, proxyFilename);
    const proxyKey = `proxy/${projectId}/${proxyFilename}`;

    // Check if proxy already exists (idempotency)
    try {
      await fs.access(proxyPath);
      logger.info(`Proxy already exists: ${proxyPath}, skipping render`);

      // Update project pointer
      project.latestProxyKey = proxyKey;
      await project.save();

      return {
        success: true,
        projectId,
        version,
        proxyPath,
        proxyKey,
        cached: true,
      };
    } catch (err) {
      // Proxy doesn't exist, proceed with render
    }

    // Get all edit operations up to this version
    const operations = await EditOperation.getAllOperationsUpToVersion(
      projectId,
      version
    );

    if (operations.length === 0) {
      throw new Error(
        `No edit operations found for project ${projectId} version ${version}`
      );
    }

    // Get source video
    const sourceVideo = await Video.findById(project.videoId);
    if (!sourceVideo) {
      throw new Error(`Source video not found: ${project.videoId}`);
    }

    // Apply all operations to create proxy
    // For now, we'll use a simplified approach: start with original video
    // and apply effects sequentially
    let currentVideoPath = sourceVideo.filePath;
    const videoProcessor = new VideoProcessor();

    // Flatten operations into single effect chain
    const allEffects = [];
    for (const op of operations) {
      if (Array.isArray(op.ops)) {
        for (const effect of op.ops) {
          if (effect.type === "effect") {
            allEffects.push({
              effect: effect.effect,
              parameters: effect.parameters || effect.params || {},
            });
          }
        }
      }
    }

    logger.info(`Applying ${allEffects.length} effects to proxy render`);

    // Create temporary working file
    const tempDir = path.join(UPLOAD_PATH, "temp");
    await fs.mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `proxy_temp_${Date.now()}.mp4`);

    // Apply effects with low resolution (480p proxy)
    if (allEffects.length > 0) {
      const metadata = await videoProcessor.getVideoMetadata(currentVideoPath);

      // Calculate 480p dimensions
      const originalHeight = metadata.video?.height || 720;
      const originalWidth = metadata.video?.width || 1280;
      const aspectRatio = originalWidth / originalHeight;
      const proxyHeight = 480;
      const proxyWidth = Math.round(proxyHeight * aspectRatio);

      // Apply effects and scale down in one pass
      const result = await videoProcessor.applyMultipleEffects(
        currentVideoPath,
        allEffects,
        { scale: `${proxyWidth}:${proxyHeight}` }
      );

      currentVideoPath = result.outputPath;
    } else {
      // No effects, just scale down
      const metadata = await videoProcessor.getVideoMetadata(currentVideoPath);
      const originalHeight = metadata.video?.height || 720;
      const originalWidth = metadata.video?.width || 1280;
      const aspectRatio = originalWidth / originalHeight;
      const proxyHeight = 480;
      const proxyWidth = Math.round(proxyHeight * aspectRatio);

      await videoProcessor.scaleVideo(
        currentVideoPath,
        tempPath,
        proxyWidth,
        proxyHeight
      );
      currentVideoPath = tempPath;
    }

    // Move result to final proxy location
    await fs.rename(currentVideoPath, proxyPath);

    // Update project with latest proxy key
    project.latestProxyKey = proxyKey;
    await project.save();

    logger.info(`Proxy render completed: ${proxyPath}`);

    return {
      success: true,
      projectId,
      version,
      proxyPath,
      proxyKey,
      cached: false,
    };
  } catch (error) {
    logger.error(
      `Proxy render failed: project=${projectId}, version=${version}`,
      error
    );
    throw error;
  }
}

/**
 * Render high-resolution export from edit operations
 * Idempotent: skips if export already exists
 *
 * @param {string} projectId - Project ID
 * @param {number} version - Version number
 * @param {object} options - Export options (resolution, format, etc.)
 * @returns {Promise<object>} - Render result with export path
 */
export async function renderExport(projectId, version, options = {}) {
  logger.info(
    `Starting export render: project=${projectId}, version=${version}`
  );

  try {
    // Get project
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Check if export already exists (idempotency)
    const existingExport = await ExportVersion.findByProjectIdAndVersion(
      projectId,
      version
    );
    if (existingExport) {
      logger.info(`Export already exists: ${existingExport.filePath}`);
      return {
        success: true,
        projectId,
        version,
        exportPath: existingExport.filePath,
        exportId: existingExport._id,
        cached: true,
      };
    }

    // Define export output path
    const exportDir = path.join(UPLOAD_PATH, "export", projectId);
    await fs.mkdir(exportDir, { recursive: true });

    const resolution = options.resolution || "1920x1080";
    const format = options.format || "mp4";
    const exportFilename = `v${version}_final.${format}`;
    const exportPath = path.join(exportDir, exportFilename);
    const exportKey = `export/${projectId}/${exportFilename}`;

    // Get all edit operations up to this version
    const operations = await EditOperation.getAllOperationsUpToVersion(
      projectId,
      version
    );

    if (operations.length === 0) {
      throw new Error(
        `No edit operations found for project ${projectId} version ${version}`
      );
    }

    // Get source video
    const sourceVideo = await Video.findById(project.videoId);
    if (!sourceVideo) {
      throw new Error(`Source video not found: ${project.videoId}`);
    }

    // Apply all operations at full resolution
    let currentVideoPath = sourceVideo.filePath;
    const videoProcessor = new VideoProcessor();

    // Flatten operations
    const allEffects = [];
    for (const op of operations) {
      if (Array.isArray(op.ops)) {
        for (const effect of op.ops) {
          if (effect.type === "effect") {
            allEffects.push({
              effect: effect.effect,
              parameters: effect.parameters || effect.params || {},
            });
          }
        }
      }
    }

    logger.info(`Applying ${allEffects.length} effects to export render`);

    // Apply effects at target resolution
    if (allEffects.length > 0) {
      const result = await videoProcessor.applyMultipleEffects(
        currentVideoPath,
        allEffects,
        { scale: resolution }
      );
      currentVideoPath = result.outputPath;
    }

    // Move result to final export location
    await fs.rename(currentVideoPath, exportPath);

    // Get file stats
    const stats = await fs.stat(exportPath);
    const metadata = await videoProcessor.getVideoMetadata(exportPath);

    // Create export version record
    const exportVersion = await ExportVersion.create({
      projectId: projectId,
      version: version,
      s3Key: exportKey,
      filePath: exportPath,
      size: stats.size,
      resolution: resolution,
      duration: metadata.duration,
      format: format,
      pinned: false,
    });

    // Update project with latest export key
    project.latestExportKey = exportKey;
    await project.save();

    logger.info(`Export render completed: ${exportPath}`);

    return {
      success: true,
      projectId,
      version,
      exportPath,
      exportId: exportVersion._id,
      exportKey,
      size: stats.size,
      cached: false,
    };
  } catch (error) {
    logger.error(
      `Export render failed: project=${projectId}, version=${version}`,
      error
    );
    throw error;
  }
}

/**
 * Helper: Scale video to target resolution
 */
VideoProcessor.prototype.scaleVideo = async function (
  inputPath,
  outputPath,
  width,
  height
) {
  const ffmpeg = (await import("fluent-ffmpeg")).default;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .size(`${width}x${height}`)
      .outputOptions([
        "-c:v libx264",
        "-preset medium",
        "-crf 23",
        "-c:a aac",
        "-b:a 128k",
      ])
      .output(outputPath)
      .on("end", () => resolve({ outputPath }))
      .on("error", (err) => reject(err))
      .run();
  });
};
