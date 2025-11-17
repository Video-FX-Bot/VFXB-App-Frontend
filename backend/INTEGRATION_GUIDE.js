/**
 * Integration Guide - Add to your existing server.js or app.js
 * 
 * Copy the relevant sections below into your main application file
 */

// ============================================
// 1. ADD THESE IMPORTS AT THE TOP
// ============================================

import editOperationsRouter from './src/routes/editOperations.js';
import adminGCRouter from './src/routes/admin/gc.js';

// ============================================
// 2. REGISTER ROUTES (add after existing routes)
// ============================================

// Edit operations and export management
app.use('/api/projects', editOperationsRouter);

// Admin GC endpoints (requires admin auth)
app.use('/api/admin/gc', adminGCRouter);

// ============================================
// 3. OPTIONAL: Initialize render queue worker
// ============================================

// Import at top:
import renderQueue from './src/workers/renderQueue.js';

// Start queue processor (it auto-starts, but you can explicitly manage it)
console.log('✅ Render queue initialized');

// ============================================
// 4. OPTIONAL: Schedule periodic GC calculation
// ============================================

// Import at top:
import GCService from './src/services/gcService.js';

// Schedule weekly GC calculation (runs every Sunday at 2 AM)
if (process.env.NODE_ENV === 'production') {
  const schedule = (await import('node-schedule')).default;
  
  schedule.scheduleJob('0 2 * * 0', async () => {
    console.log('🗑️  Running scheduled GC candidate calculation...');
    try {
      const report = await GCService.calcGCCandidates({
        ttlDays: parseInt(process.env.GC_TTL_DAYS || '30'),
        keepLatestN: parseInt(process.env.GC_KEEP_LATEST_N || '3')
      });
      console.log('✅ GC calculation complete:', report);
    } catch (error) {
      console.error('❌ GC calculation failed:', error);
    }
  });
  
  console.log('✅ Scheduled GC calculation (Sundays at 2 AM)');
}

// ============================================
// 5. EXAMPLE: Complete server.js integration
// ============================================

/*
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './src/utils/logger.js';

// Load environment variables
dotenv.config();

// Import your existing routes
import videoRouter from './src/routes/video.js';
import effectsRouter from './src/routes/effects.js';
import captionsRouter from './src/routes/captions.js';
// ... other existing routes ...

// Import NEW hybrid workflow routes
import editOperationsRouter from './src/routes/editOperations.js';
import adminGCRouter from './src/routes/admin/gc.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Existing routes
app.use('/api/videos', videoRouter);
app.use('/api/video-edit', effectsRouter);
app.use('/api/video-edit', captionsRouter);
// ... other existing routes ...

// NEW hybrid workflow routes
app.use('/api/projects', editOperationsRouter);
app.use('/api/admin/gc', adminGCRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    hybridWorkflow: 'enabled',
    timestamp: new Date().toISOString() 
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT}`);
  logger.info(`✅ Hybrid workflow enabled`);
  logger.info(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
});
*/

// ============================================
// 6. ENVIRONMENT VARIABLES (.env)
// ============================================

/*
# Add these to your .env file

# Upload directory (defaults to ./uploads)
UPLOAD_PATH=./uploads

# Data directory for JSON files (defaults to ./data)
DATA_PATH=./data

# GC settings (optional, can be overridden per request)
GC_TTL_DAYS=30
GC_KEEP_LATEST_N=3

# Worker settings (optional)
WORKER_CONCURRENCY=2
RENDER_TIMEOUT=300000

# Feature flags (optional)
ENABLE_AUTO_PROXY=true
ENABLE_DEDUPLICATION=true
*/

// ============================================
// 7. PACKAGE.JSON SCRIPTS
// ============================================

/*
Add these scripts to your package.json:

{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "mocha src/tests/**.test.js",
    "backfill": "node scripts/backfill.js",
    "backfill:dry-run": "node scripts/backfill.js --dry-run",
    "gc:calculate": "node scripts/gc-calculate.js",
    "gc:report": "node scripts/gc-report.js"
  }
}
*/

// ============================================
// 8. TESTING THE INTEGRATION
// ============================================

/*
# Test sequence:

1. Start server:
   npm run dev

2. Create a project (existing endpoint):
   POST /api/projects
   { "name": "Test Hybrid", "videoId": "video-123" }

3. Add edit operations:
   POST /api/projects/{projectId}/ops
   {
     "ops": [
       {"type": "effect", "effect": "snow", "parameters": {"density": 50}}
     ]
   }

4. Check proxy was created:
   GET /api/projects/{projectId}
   # Should show: currentVersion: 1, latestProxyKey: "proxy/..."

5. Export high-res:
   POST /api/projects/{projectId}/export
   { "version": 1 }

6. List exports:
   GET /api/projects/{projectId}/exports

7. Pin an export:
   POST /api/projects/{projectId}/versions/1/pin

8. (Admin) Calculate GC:
   POST /api/admin/gc/calculate
   { "ttlDays": 30, "keepLatestN": 3 }

9. (Admin) View candidates:
   GET /api/admin/gc/candidates
*/

// ============================================
// 9. ROLLBACK PROCEDURE (if needed)
// ============================================

/*
If you need to rollback:

1. Stop the server:
   npm stop

2. Remove new routes from server.js:
   - Comment out editOperationsRouter
   - Comment out adminGCRouter

3. Restore backup:
   rm -rf ./data
   cp -r ./data_backup_YYYYMMDD ./data
   
4. Restart server:
   npm start

Old functionality will continue working normally.
*/

export default {
  message: 'Hybrid workflow integration guide',
  status: 'ready-to-integrate'
};
