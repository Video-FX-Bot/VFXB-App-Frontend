import { promises as fs } from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

// Helper to ensure absolute paths
const resolveUploadPath = (filename) => {
  const basePath = process.env.UPLOAD_PATH || "./uploads";
  const relativePath = path.join(basePath, "videos", filename);
  return path.resolve(process.cwd(), relativePath);
};

export const handleVideoStream = async (req, res) => {
  let streamHandle;

  try {
    // Read videos from local storage
    const videosPath = path.join(
      process.env.DATA_PATH || "./data",
      "videos.json"
    );
    logger.info(`Reading videos from: ${videosPath}`);

    const videos = await fs
      .readFile(videosPath, "utf8")
      .then((data) => JSON.parse(data))
      .catch((error) => {
        logger.error(
          `Failed to read videos from ${videosPath}: ${error.message}`
        );
        return [];
      });

    const video = videos.find((v) => v._id === req.params.id);

    if (!video) {
      logger.error(`Video not found: ${req.params.id}`);
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    // Check if user has access to this video
    if (
      video.privacy?.visibility === "private" &&
      video.userId !== req.user.id
    ) {
      logger.error(
        `Access denied for video ${req.params.id} by user ${req.user.id}`
      );
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Get absolute path and ensure it exists
    const videoPath = resolveUploadPath(video.filename);
    logger.info(`Attempting to stream video from: ${videoPath}`);

    // Check if file exists
    const fileExists = await fs.stat(videoPath).catch((error) => {
      logger.error(`Error checking video file: ${error.message}`);
      return false;
    });

    if (!fileExists) {
      logger.error(`Video file not found at path: ${videoPath}`);
      return res
        .status(404)
        .json({ success: false, message: "Video file not found" });
    }

    // Get file stats
    const stat = await fs.stat(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      streamHandle = fs.createReadStream(videoPath, { start, end });

      const headers = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": video.mimeType || "video/mp4",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      };

      res.writeHead(206, headers);
    } else {
      const headers = {
        "Content-Length": fileSize,
        "Content-Type": video.mimeType || "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      };
      res.writeHead(200, headers);
      streamHandle = fs.createReadStream(videoPath);
    }

    // Set up stream error handling
    streamHandle.on("error", (streamError) => {
      logger.error(`Stream error for video ${req.params.id}:`, streamError);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ success: false, message: "Error streaming video" });
      }
    });

    // Pipe the stream to response
    streamHandle.pipe(res);

    // Clean up on request close/finish
    req.on("close", () => {
      if (streamHandle) {
        streamHandle.destroy();
      }
    });
  } catch (error) {
    logger.error("Error in video streaming:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Error streaming video",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
    if (streamHandle) {
      streamHandle.destroy();
    }
  }
};
