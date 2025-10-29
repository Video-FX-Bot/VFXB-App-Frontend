#!/usr/bin/env node

/**
 * Backfill Script for Hybrid Workflow Migration
 *
 * This script safely migrates existing projects to the new hybrid workflow:
 * 1. Adds version control fields to all projects
 * 2. Creates ExportVersion records for existing final exports
 * 3. Pins existing exports by default (prevents accidental GC)
 *
 * Usage:
 *   node scripts/backfill.js [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import models (need to go up from scripts/ to backend root)
const Project = (await import("../src/models/Project.js")).Project;
const ExportVersion = (await import("../src/models/ExportVersion.js"))
  .ExportVersion;
const localStorageService = (
  await import("../src/services/localStorageService.js")
).default;

const isDryRun = process.argv.includes("--dry-run");

console.log("🔄 Hybrid Workflow Backfill Script");
console.log("===================================");
if (isDryRun) {
  console.log("🔍 DRY RUN MODE - No changes will be made\n");
} else {
  console.log("⚠️  LIVE MODE - Changes will be applied\n");
}

async function backfillProjects() {
  const stats = {
    totalProjects: 0,
    projectsUpdated: 0,
    exportsCreated: 0,
    errors: [],
  };

  try {
    // Read all projects
    const projects = await localStorageService.readCollection("projects");
    stats.totalProjects = projects.length;

    console.log(`📊 Found ${projects.length} projects\n`);

    for (const project of projects) {
      console.log(`\n📁 Processing project: ${project._id}`);
      console.log(`   Name: ${project.name}`);

      try {
        let needsUpdate = false;

        // Add version control fields if missing
        if (project.currentVersion === undefined) {
          console.log("   ✅ Adding version control fields");
          project.currentVersion = 0;
          project.latestProxyKey = null;
          project.latestExportKey = null;
          needsUpdate = true;
        } else {
          console.log(
            `   ℹ️  Already has version control (v${project.currentVersion})`
          );
        }

        // Check for existing final export
        const possiblePaths = [
          path.join(
            process.env.UPLOAD_PATH || "./uploads",
            "videos",
            `${project._id}_final.mp4`
          ),
          path.join(
            process.env.UPLOAD_PATH || "./uploads",
            "videos",
            `${project.videoId}_final.mp4`
          ),
          path.join(
            process.env.UPLOAD_PATH || "./uploads",
            "export",
            project._id,
            "final.mp4"
          ),
        ];

        let foundExportPath = null;
        let foundStats = null;

        for (const checkPath of possiblePaths) {
          try {
            const stats = await fs.stat(checkPath);
            if (stats.isFile()) {
              foundExportPath = checkPath;
              foundStats = stats;
              console.log(`   📹 Found existing export: ${checkPath}`);
              break;
            }
          } catch (err) {
            // Path doesn't exist, continue
          }
        }

        if (foundExportPath && foundStats) {
          // Check if export version already exists
          const existingExport = await ExportVersion.findByProjectIdAndVersion(
            project._id,
            1
          );

          if (!existingExport) {
            const relativeKey = path
              .relative(process.env.UPLOAD_PATH || "./uploads", foundExportPath)
              .replace(/\\/g, "/");

            console.log(`   ✅ Creating ExportVersion record (pinned)`);
            console.log(
              `      Size: ${
                Math.round((foundStats.size / (1024 * 1024)) * 100) / 100
              } MB`
            );

            if (!isDryRun) {
              const exportVersion = await ExportVersion.create({
                projectId: project._id,
                version: 1,
                s3Key: relativeKey,
                filePath: foundExportPath,
                size: foundStats.size,
                resolution: project.settings?.resolution || "1920x1080",
                format: "mp4",
                pinned: true, // Pin by default to prevent accidental deletion
              });

              project.currentVersion = Math.max(project.currentVersion, 1);
              project.latestExportKey = relativeKey;
              needsUpdate = true;
              stats.exportsCreated++;

              console.log(`      Export ID: ${exportVersion._id}`);
            } else {
              console.log("      [DRY RUN] Would create export version");
            }
          } else {
            console.log(
              `   ℹ️  Export version already exists (${existingExport._id})`
            );
          }
        } else {
          console.log("   ℹ️  No existing export found");
        }

        // Save project updates
        if (needsUpdate) {
          if (!isDryRun) {
            await localStorageService.updateProject(project._id, project);
            stats.projectsUpdated++;
            console.log("   💾 Project updated");
          } else {
            console.log("   [DRY RUN] Would update project");
          }
        }
      } catch (error) {
        console.error(
          `   ❌ Error processing project ${project._id}:`,
          error.message
        );
        stats.errors.push({
          projectId: project._id,
          error: error.message,
        });
      }
    }

    // Print summary
    console.log("\n\n📊 Backfill Summary");
    console.log("===================");
    console.log(`Total projects: ${stats.totalProjects}`);
    console.log(`Projects updated: ${stats.projectsUpdated}`);
    console.log(`Export versions created: ${stats.exportsCreated}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log("\n❌ Errors:");
      stats.errors.forEach((err) => {
        console.log(`   - Project ${err.projectId}: ${err.error}`);
      });
    }

    if (isDryRun) {
      console.log(
        "\n🔍 This was a dry run. Run without --dry-run to apply changes."
      );
    } else {
      console.log("\n✅ Backfill complete!");
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run backfill
backfillProjects()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });
