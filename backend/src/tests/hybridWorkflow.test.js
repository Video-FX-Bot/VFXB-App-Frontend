import { describe, it, before } from "mocha";
import { expect } from "chai";
import { EditOperation } from "../src/models/EditOperation.js";
import { ExportVersion } from "../src/models/ExportVersion.js";
import { Project } from "../src/models/Project.js";
import localStorageService from "../src/services/localStorageService.js";

describe("Hybrid Workflow Tests", () => {
  let testProjectId;
  let testUserId = "test-user-123";

  before(async () => {
    // Create test project
    const project = new Project({
      userId: testUserId,
      name: "Test Project",
      videoId: "test-video-123",
    });
    await project.save();
    testProjectId = project._id;
  });

  describe("EditOperation Model", () => {
    it("should create edit operation with version 1", async () => {
      const editOp = await EditOperation.create({
        projectId: testProjectId,
        version: 1,
        ops: [{ type: "effect", effect: "snow", parameters: { density: 50 } }],
        userId: testUserId,
      });

      expect(editOp._id).to.exist;
      expect(editOp.version).to.equal(1);
      expect(editOp.ops).to.be.an("array").with.lengthOf(1);
    });

    it("should retrieve edit operations by project ID", async () => {
      const operations = await EditOperation.findByProjectId(testProjectId);

      expect(operations).to.be.an("array");
      expect(operations.length).to.be.at.least(1);
      expect(operations[0].projectId).to.equal(testProjectId);
    });

    it("should get operations up to specific version", async () => {
      // Create version 2
      await EditOperation.create({
        projectId: testProjectId,
        version: 2,
        ops: [
          { type: "effect", effect: "fire", parameters: { intensity: 70 } },
        ],
        userId: testUserId,
      });

      const operations = await EditOperation.getAllOperationsUpToVersion(
        testProjectId,
        1
      );

      expect(operations).to.be.an("array").with.lengthOf(1);
      expect(operations[0].version).to.equal(1);
    });

    it("should get latest version number", async () => {
      const latestVersion = await EditOperation.getLatestVersion(testProjectId);

      expect(latestVersion).to.be.at.least(2);
    });
  });

  describe("ExportVersion Model", () => {
    it("should create export version", async () => {
      const exportVer = await ExportVersion.create({
        projectId: testProjectId,
        version: 1,
        s3Key: `export/${testProjectId}/v1_final.mp4`,
        filePath: `uploads/export/${testProjectId}/v1_final.mp4`,
        size: 1000000,
        resolution: "1920x1080",
        duration: 30,
        format: "mp4",
      });

      expect(exportVer._id).to.exist;
      expect(exportVer.pinned).to.equal(false);
      expect(exportVer.gcCandidate).to.equal(false);
    });

    it("should toggle pin status", async () => {
      const exportVer = await ExportVersion.findByProjectIdAndVersion(
        testProjectId,
        1
      );

      expect(exportVer.pinned).to.equal(false);

      await exportVer.togglePin();
      expect(exportVer.pinned).to.equal(true);

      await exportVer.togglePin();
      expect(exportVer.pinned).to.equal(false);
    });

    it("should mark for GC", async () => {
      const exportVer = await ExportVersion.findByProjectIdAndVersion(
        testProjectId,
        1
      );

      await exportVer.markForGC();

      expect(exportVer.gcCandidate).to.equal(true);
      expect(exportVer.gcMarkedAt).to.exist;
    });

    it("should not mark pinned export for GC", async () => {
      const exportVer = await ExportVersion.findByProjectIdAndVersion(
        testProjectId,
        1
      );

      await exportVer.unmarkForGC();
      await exportVer.togglePin(); // Pin it

      try {
        await exportVer.markForGC();
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.message).to.include("pinned");
      }
    });

    it("should find GC candidates", async () => {
      // Unpin and mark
      const exportVer = await ExportVersion.findByProjectIdAndVersion(
        testProjectId,
        1
      );
      await exportVer.togglePin(); // Unpin
      await exportVer.markForGC();

      const candidates = await ExportVersion.findGCCandidates(0);

      expect(candidates).to.be.an("array");
      const found = candidates.find((c) => c.projectId === testProjectId);
      expect(found).to.exist;
    });
  });

  describe("Project Version Control", () => {
    it("should initialize project with version 0", async () => {
      const project = await Project.findById(testProjectId);

      expect(project.currentVersion).to.exist;
    });

    it("should update project version pointers", async () => {
      const project = await Project.findById(testProjectId);

      project.currentVersion = 2;
      project.latestProxyKey = `proxy/${testProjectId}/v2_proxy.mp4`;
      project.latestExportKey = `export/${testProjectId}/v2_final.mp4`;

      await project.save();

      const updated = await Project.findById(testProjectId);
      expect(updated.currentVersion).to.equal(2);
      expect(updated.latestProxyKey).to.exist;
      expect(updated.latestExportKey).to.exist;
    });
  });

  describe("SHA256 Deduplication", () => {
    it("should find video by SHA256 hash", async () => {
      // Create test video with SHA256
      const testVideo = {
        _id: "test-video-hash-123",
        title: "Test Video",
        userId: testUserId,
        sha256: "abcdef1234567890",
        refCount: 1,
        filePath: "uploads/videos/test.mp4",
        filename: "test.mp4",
        fileSize: 1000000,
        mimeType: "video/mp4",
      };

      await localStorageService.createVideo(testVideo);

      const found = await localStorageService.findVideoByHash(
        "abcdef1234567890"
      );
      expect(found).to.exist;
      expect(found._id).to.equal("test-video-hash-123");
    });

    it("should increment ref count", async () => {
      const updated = await localStorageService.incrementVideoRefCount(
        "test-video-hash-123"
      );

      expect(updated.refCount).to.equal(2);
    });

    it("should decrement ref count", async () => {
      const updated = await localStorageService.decrementVideoRefCount(
        "test-video-hash-123"
      );

      expect(updated.refCount).to.equal(1);
    });
  });
});

// Run tests: npm test
