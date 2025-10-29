import { logger } from "../utils/logger.js";

/**
 * Simple in-memory job queue for proxy and export rendering
 * In production, use Bull, BullMQ, or similar job queue with Redis
 */
class RenderQueue {
  constructor() {
    this.jobs = new Map();
    this.jobCounter = 0;
    this.processing = false;
  }

  /**
   * Enqueue a proxy render job
   */
  async enqueueProxyRender(projectId, version) {
    const jobId = `proxy_${projectId}_v${version}_${Date.now()}`;

    this.jobs.set(jobId, {
      id: jobId,
      type: "proxy",
      projectId,
      version,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    logger.info(`Proxy render job enqueued: ${jobId}`);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Enqueue an export render job
   */
  async enqueueExportRender(projectId, version, options = {}) {
    const jobId = `export_${projectId}_v${version}_${Date.now()}`;

    this.jobs.set(jobId, {
      id: jobId,
      type: "export",
      projectId,
      version,
      options,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    logger.info(`Export render job enqueued: ${jobId}`);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Process queued jobs (simple FIFO)
   */
  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    logger.info("Starting render queue processor...");

    while (this.jobs.size > 0) {
      // Get first pending job
      const job = Array.from(this.jobs.values()).find(
        (j) => j.status === "pending"
      );

      if (!job) break;

      // Mark as processing
      job.status = "processing";
      this.jobs.set(job.id, job);

      try {
        if (job.type === "proxy") {
          await this.processProxyJob(job);
        } else if (job.type === "export") {
          await this.processExportJob(job);
        }

        job.status = "completed";
        this.jobs.set(job.id, job);
        logger.info(`Job completed: ${job.id}`);
      } catch (error) {
        job.status = "failed";
        job.error = error.message;
        this.jobs.set(job.id, job);
        logger.error(`Job failed: ${job.id}`, error);
      }

      // Small delay between jobs
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processing = false;
    logger.info("Render queue processor stopped.");
  }

  /**
   * Process proxy render job
   * Implemented in renderWorkers.js
   */
  async processProxyJob(job) {
    const { renderProxy } = await import("./renderWorkers.js");
    return await renderProxy(job.projectId, job.version);
  }

  /**
   * Process export render job
   * Implemented in renderWorkers.js
   */
  async processExportJob(job) {
    const { renderExport } = await import("./renderWorkers.js");
    return await renderExport(job.projectId, job.version, job.options);
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Clear completed jobs older than TTL
   */
  clearCompletedJobs(ttlMs = 3600000) {
    // 1 hour default
    const now = Date.now();
    const cutoff = now - ttlMs;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === "completed" || job.status === "failed") {
        const jobTime = new Date(job.createdAt).getTime();
        if (jobTime < cutoff) {
          this.jobs.delete(jobId);
          logger.info(`Cleared old job: ${jobId}`);
        }
      }
    }
  }
}

// Singleton instance
const renderQueue = new RenderQueue();

// Auto-clear completed jobs every hour
setInterval(() => {
  renderQueue.clearCompletedJobs();
}, 3600000);

// Export helper functions
export const enqueueProxyRender = (projectId, version) => {
  return renderQueue.enqueueProxyRender(projectId, version);
};

export const enqueueExportRender = (projectId, version, options) => {
  return renderQueue.enqueueExportRender(projectId, version, options);
};

export const getJobStatus = (jobId) => {
  return renderQueue.getJobStatus(jobId);
};

export default renderQueue;
