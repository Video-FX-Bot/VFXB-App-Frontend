# Hybrid Workflow Migration Guide

## Overview

This guide covers the migration from the current video editor architecture to a hybrid workflow with:

- **Version-controlled edit operations** (EDL - Edit Decision List)
- **Low-resolution proxy rendering** for fast preview
- **High-resolution export on demand**
- **SHA256-based asset deduplication**
- **Safe garbage collection** with pinning support

## Architecture Changes

### Database Collections (JSON Files)

#### New Collections

1. **editOperations.json** - Append-only log of edit operations

   ```json
   {
     "_id": "uuid",
     "projectId": "project-id",
     "version": 1,
     "ops": [
       {"type": "effect", "effect": "snow", "parameters": {...}}
     ],
     "userId": "user-id",
     "createdAt": "2025-10-27T..."
   }
   ```

2. **exportVersions.json** - Track high-res export versions
   ```json
   {
     "_id": "uuid",
     "projectId": "project-id",
     "version": 1,
     "s3Key": "export/project-id/v1_final.mp4",
     "filePath": "uploads/export/project-id/v1_final.mp4",
     "size": 12345678,
     "resolution": "1920x1080",
     "duration": 30.5,
     "format": "mp4",
     "pinned": false,
     "gcCandidate": false,
     "gcMarkedAt": null,
     "createdAt": "2025-10-27T..."
   }
   ```

#### Modified Collections

**projects.json** - Added version control fields:

```json
{
  "_id": "project-id",
  "userId": "user-id",
  "name": "My Project",
  // ... existing fields ...
  "currentVersion": 5,
  "latestProxyKey": "proxy/project-id/v5_proxy.mp4",
  "latestExportKey": "export/project-id/v5_final.mp4"
}
```

**videos.json** - Added deduplication fields:

```json
{
  "_id": "video-id",
  // ... existing fields ...
  "sha256": "abcdef1234567890...",
  "refCount": 3
}
```

### File Storage Structure

All files continue using the same `uploads/` directory:

```
uploads/
  ├── videos/           # Original uploaded videos
  │   └── video_123.mp4
  ├── proxy/            # Low-res proxies (480p)
  │   └── {projectId}/
  │       ├── v1_proxy.mp4
  │       ├── v2_proxy.mp4
  │       └── v3_proxy.mp4
  ├── export/           # High-res exports
  │   └── {projectId}/
  │       ├── v1_final.mp4
  │       ├── v2_final.mp4
  │       └── v3_final.mp4
  ├── archive/          # Archived (soft-deleted) exports
  │   └── {exportId}_v1_final.mp4
  └── temp/             # Temporary render files
```

## Migration Steps

### Step 1: Backup Current Data

```bash
# Backup JSON data files
cp -r ./data ./data_backup_$(date +%Y%m%d)

# Backup uploaded files
cp -r ./uploads ./uploads_backup_$(date +%Y%m%d)
```

### Step 2: Initialize New Collections

The system will automatically create empty collection files on first run:

- `data/editOperations.json`
- `data/exportVersions.json`

No manual initialization needed - `localStorageService` handles this.

### Step 3: Backfill Existing Projects (Optional)

If you have existing projects with final exports, you can backfill them:

```javascript
// Run this script to backfill existing projects
import { Project } from "./src/models/Project.js";
import { ExportVersion } from "./src/models/ExportVersion.js";
import localStorageService from "./src/services/localStorageService.js";
import { promises as fs } from "fs";
import path from "path";

async function backfillProjects() {
  const projects = await localStorageService.readCollection("projects");

  for (const project of projects) {
    // Initialize version control fields if missing
    if (project.currentVersion === undefined) {
      project.currentVersion = 0;
      project.latestProxyKey = null;
      project.latestExportKey = null;

      await localStorageService.updateProject(project._id, project);
      console.log(`✅ Initialized version control for project: ${project._id}`);
    }

    // Check if project has existing final export
    const possibleExportPath = path.join(
      process.env.UPLOAD_PATH || "./uploads",
      "videos",
      `${project._id}_final.mp4`
    );

    try {
      const stats = await fs.stat(possibleExportPath);

      // Create export version record pointing to existing file
      const exportVersion = await ExportVersion.create({
        projectId: project._id,
        version: 1,
        s3Key: `videos/${project._id}_final.mp4`,
        filePath: possibleExportPath,
        size: stats.size,
        resolution: project.settings?.resolution || "1920x1080",
        format: "mp4",
        pinned: true, // Pin existing exports by default
      });

      // Update project pointer
      project.currentVersion = 1;
      project.latestExportKey = exportVersion.s3Key;
      await localStorageService.updateProject(project._id, project);

      console.log(`✅ Backfilled export for project: ${project._id}`);
    } catch (err) {
      // No existing export, that's fine
      console.log(`ℹ️ No existing export for project: ${project._id}`);
    }
  }

  console.log("✅ Backfill complete!");
}

// Run: node -r esm backfill.js
backfillProjects().catch(console.error);
```

Save this as `backend/scripts/backfill.js` and run:

```bash
cd backend
node scripts/backfill.js
```

### Step 4: Update API Routes

Register new routes in your main app file (`server.js` or `app.js`):

```javascript
import editOperationsRouter from "./src/routes/editOperations.js";
import adminGCRouter from "./src/routes/admin/gc.js";

// ... existing routes ...

// Add new routes
app.use("/api/projects", editOperationsRouter);
app.use("/api/admin/gc", adminGCRouter);
```

### Step 5: Environment Variables

Add these to your `.env` file (optional, defaults provided):

```bash
# Upload directory (defaults to ./uploads)
UPLOAD_PATH=./uploads

# Data directory for JSON files (defaults to ./data)
DATA_PATH=./data

# GC settings (can be overridden per request)
GC_TTL_DAYS=30
GC_KEEP_LATEST_N=3
```

## API Usage

### 1. Append Edit Operations

```bash
POST /api/projects/:projectId/ops

{
  "ops": [
    {
      "type": "effect",
      "effect": "snow",
      "parameters": { "density": 50, "size": 3 }
    },
    {
      "type": "effect",
      "effect": "brightness",
      "parameters": { "brightness": 20, "contrast": 10 }
    }
  ]
}

Response:
{
  "success": true,
  "message": "Edit operations saved",
  "data": {
    "projectId": "project-123",
    "version": 2,
    "operationId": "op-456",
    "jobId": "proxy_project-123_v2_1234567890"
  }
}
```

This will:

- Save operations to `editOperations.json`
- Bump `projects.currentVersion` to 2
- Enqueue proxy render job
- Generate `proxy/project-123/v2_proxy.mp4` (480p)

### 2. Request High-Res Export

```bash
POST /api/projects/:projectId/export

{
  "version": 2,  // Optional, defaults to current version
  "resolution": "1920x1080",
  "format": "mp4"
}

Response:
{
  "success": true,
  "message": "Export job enqueued",
  "data": {
    "projectId": "project-123",
    "version": 2,
    "jobId": "export_project-123_v2_1234567890",
    "status": "pending"
  }
}
```

This will:

- Enqueue export render job
- Apply all operations up to version 2
- Generate `export/project-123/v2_final.mp4` (full res)
- Create `exportVersions` record
- Update `projects.latestExportKey`

### 3. Pin an Export

```bash
POST /api/projects/:projectId/versions/2/pin

Response:
{
  "success": true,
  "message": "Export pinned successfully",
  "data": {
    "projectId": "project-123",
    "version": 2,
    "pinned": true
  }
}
```

Pinned exports will **never** be garbage collected.

### 4. Admin: Calculate GC Candidates

```bash
POST /api/admin/gc/calculate

{
  "ttlDays": 30,
  "keepLatestN": 3
}

Response:
{
  "success": true,
  "data": {
    "totalProjects": 50,
    "projectsProcessed": 50,
    "candidatesMarked": 15,
    "candidatesAlreadyMarked": 5,
    "exportsPinned": 10,
    "exportsKept": 150,
    "candidates": [
      {
        "projectId": "project-123",
        "version": 1,
        "exportId": "export-789",
        "filePath": "uploads/export/project-123/v1_final.mp4",
        "size": 12345678,
        "createdAt": "2025-09-15T...",
        "gcMarkedAt": "2025-10-27T..."
      }
    ]
  }
}
```

This **ONLY marks** candidates - does not delete anything.

### 5. Admin: Get GC Candidates

```bash
GET /api/admin/gc/candidates?olderThanDays=7

Response:
{
  "success": true,
  "data": {
    "count": 15,
    "totalSize": 500000000,
    "totalSizeMB": 476.84,
    "candidates": [...]
  }
}
```

### 6. Admin: Archive Exports (Soft Delete)

```bash
POST /api/admin/gc/archive

{
  "exportIds": ["export-789", "export-012"]
}

Response:
{
  "success": true,
  "message": "Archived 2 exports",
  "data": {
    "archived": 2,
    "failed": 0,
    "archivedExports": [
      {
        "exportId": "export-789",
        "projectId": "project-123",
        "version": 1,
        "archivedPath": "uploads/archive/export-789_v1_final.mp4"
      }
    ]
  }
}
```

Files are moved to `uploads/archive/` - can be restored manually if needed.

### 7. Admin: Permanently Delete Archives

```bash
POST /api/admin/gc/delete

{
  "exportIds": ["export-789"],
  "confirmed": true  // Must be true
}

Response:
{
  "success": true,
  "message": "Deleted 1 exports, saved 50 MB",
  "data": {
    "deleted": 1,
    "failed": 0,
    "spaceSaved": 52428800
  }
}
```

⚠️ **DANGER**: This permanently deletes files. Cannot be undone.

## Testing

### Test Edit Operations

```bash
# 1. Create a project (existing endpoint)
POST /api/projects
{ "name": "Test Project", "videoId": "video-123" }

# 2. Add edit operations
POST /api/projects/{projectId}/ops
{ "ops": [{"type": "effect", "effect": "snow", "parameters": {"density": 50}}] }

# 3. Check proxy was created
GET /api/projects/{projectId}
# Should show currentVersion: 1, latestProxyKey: "proxy/..."

# 4. Export high-res
POST /api/projects/{projectId}/export
{ "version": 1 }

# 5. Pin the export
POST /api/projects/{projectId}/versions/1/pin
```

### Test Deduplication

```bash
# Upload same video twice
POST /api/videos/upload (file: video1.mp4)
# Response: { "video": { "id": "video-abc", "sha256": "hash123..." } }

POST /api/videos/upload (file: same_video_different_name.mp4)
# Response: { "video": { "duplicate": true, "originalId": "video-abc", "refCount": 2 } }
```

### Test GC

```bash
# Mark candidates
POST /api/admin/gc/calculate
{ "ttlDays": 0, "keepLatestN": 1 }  # Aggressive for testing

# View candidates
GET /api/admin/gc/candidates

# Archive selected
POST /api/admin/gc/archive
{ "exportIds": ["export-123"] }

# Delete archived
POST /api/admin/gc/delete
{ "exportIds": ["export-123"], "confirmed": true }
```

## Rollback Plan

If issues arise:

1. **Stop the server**
2. **Restore backup**:
   ```bash
   rm -rf ./data
   cp -r ./data_backup_YYYYMMDD ./data
   rm -rf ./uploads
   cp -r ./uploads_backup_YYYYMMDD ./uploads
   ```
3. **Remove new routes** from server.js
4. **Restart server**

## Production Considerations

1. **Job Queue**: Replace in-memory `renderQueue` with Redis-backed Bull/BullMQ
2. **Worker Processes**: Run render workers in separate processes/containers
3. **Presigned URLs**: Implement presigned URLs for secure file access
4. **Admin Auth**: Implement proper role-based access control (RBAC)
5. **GC Schedule**: Set up cron job to run `calcGCCandidates()` weekly
6. **Monitoring**: Add metrics for queue depth, render times, storage usage

## Support

For issues or questions:

- Check logs in `./logs/`
- Review `backend/docs/` for API documentation
- Contact: [your-support-email]
