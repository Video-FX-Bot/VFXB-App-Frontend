# Hybrid Workflow - Quick Start Guide

## 🚀 5-Minute Integration

### 1. Add Routes to Your Server

Open your `backend/server.js` (or `app.js`) and add:

```javascript
// At the top with other imports
import editOperationsRouter from "./src/routes/editOperations.js";
import adminGCRouter from "./src/routes/admin/gc.js";

// After your existing routes
app.use("/api/projects", editOperationsRouter);
app.use("/api/admin/gc", adminGCRouter);
```

### 2. Restart Your Server

```bash
npm run dev
```

The system will automatically create the new JSON collection files:

- `data/editOperations.json`
- `data/exportVersions.json`

### 3. Test It Works

```bash
# 1. Create a project (use existing project creation endpoint)
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "Test Hybrid", "videoId": "your-video-id"}'

# 2. Add edit operations
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/ops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"ops": [{"type": "effect", "effect": "snow", "parameters": {"density": 50}}]}'

# 3. Check response - should show version: 1 and jobId
```

### 4. Optional: Backfill Existing Projects

```bash
# Dry run first to see what would happen
node backend/scripts/backfill.js --dry-run

# If looks good, run for real
node backend/scripts/backfill.js
```

---

## ✅ That's It!

Your system now supports:

- ✅ Version-controlled edits
- ✅ Automatic proxy generation (480p)
- ✅ On-demand high-res exports
- ✅ SHA256 asset deduplication
- ✅ Safe garbage collection

---

## 📚 Next Steps

1. **Read Full Documentation**: `HYBRID_WORKFLOW_MIGRATION.md`
2. **API Reference**: See migration doc for all endpoints
3. **Run Tests**: `npm test` to verify everything works
4. **Configure GC**: Set up admin access and GC schedule

---

## 🆘 Troubleshooting

**Q: Server won't start**

- Check that all imports resolve correctly
- Make sure `data/` and `uploads/` directories exist

**Q: Routes return 404**

- Verify routes are registered in server.js
- Check that router imports are correct

**Q: Proxy/Export not generating**

- Check `uploads/proxy/` and `uploads/export/` directories are writable
- Look at server logs for worker errors

**Q: Want to rollback?**

- Stop server
- Remove new route registrations
- Restore `data/` from backup
- Restart server

---

## 📞 Support

- **Full Guide**: `HYBRID_WORKFLOW_MIGRATION.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Integration Help**: `INTEGRATION_GUIDE.js`

**Ready to go! 🎉**
