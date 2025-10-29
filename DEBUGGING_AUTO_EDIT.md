# Debugging Auto-Edit Not Showing

## Issue

After uploading a video and clicking "Start Editing", the AI Editor page loads but:

- No enhanced video appears
- No "AI analyzing your video..." message shows

## Debugging Steps

### 1. Check Backend Logs

When you upload a video, you should see in the backend console:

```
🎬 Starting background processing for video: [videoId]
👤 User ID: [userId]
📡 Room name: user_[userId]
✅ Socket.io instance found, will emit to room: user_[userId]
📤 Emitting video_processing to room: user_[userId]
✅ Emitted processing started event
```

**If you DON'T see this:**

- The background processing isn't starting
- Check if `processVideoInBackground` is being called

### 2. Check Socket Connection Logs

When a socket connects, you should see:

```
🔌 User connected: [userId]
📍 Socket ID: [socketId]
🏠 Joining room: user_[userId]
✅ Socket now in rooms: [socketId], user_[userId]
```

**Important:** The `userId` must match between:

- Socket connection: `user_[userId]`
- Background processing: `user_[userId]`

### 3. Check Frontend Console

In the browser console, you should see:

```
✅ Connected to server
🔌 Setting up socket connection in AIEditor
=== AI Editor Video Loading Debug ===
Video data received: { id, url, ... }
```

**And after a few seconds:**

```
📊 Video processing update: { status: "processing", progress: 10, ... }
```

### 4. Common Issues

#### Issue A: UserIds Don't Match

**Symptoms:** Backend emits events but frontend doesn't receive them

**Cause:** Socket userId format differs from req.user.id

**Check:**

1. Backend log: `user_123` (from socket)
2. Backend log: `user_abc456` (from upload)
3. These must match!

**Fix:** Look at how userId is set in:

- `backend/src/middleware/socketAuth.js` → `socket.userId = user.id`
- `backend/src/routes/video.js` → `req.user.id`

#### Issue B: Socket Not Connected When Upload Happens

**Symptoms:** No socket logs when video uploads

**Cause:** Frontend navigates to AI Editor but socket hasn't connected yet

**Fix:** Socket should connect in `AIEditor` `useEffect` on mount

**Check frontend:**

```javascript
useEffect(() => {
  socketService.connect();
  // ... listeners
}, []);
```

#### Issue C: Global.io Not Set

**Symptoms:** Backend log shows "Socket.io instance not found!"

**Cause:** `global.io` not set in server.js

**Fix:** In `backend/server.js`:

```javascript
const io = new Server(server, { ... });
global.io = io; // ← Must be here
```

#### Issue D: Wrong API URL

**Symptoms:** Socket connects to wrong server

**Cause:** VITE_API_URL mismatch

**Check:**

- Frontend `.env`: `VITE_API_URL=http://localhost:5000`
- Backend running on: `http://localhost:5000`
- Must match!

### 5. Manual Test

#### Test Socket Emission Manually

Add this to backend after video saves:

```javascript
// In video.js upload route, after video.save()
setTimeout(() => {
  const io = global.io;
  if (io) {
    const roomName = `user_${req.user.id}`;
    console.log("🧪 TEST: Emitting to room:", roomName);
    io.to(roomName).emit("test_event", { message: "Hello from backend!" });
  }
}, 2000);
```

Add this to frontend AIEditor:

```javascript
// In useEffect with socket listeners
socketService.on("test_event", (data) => {
  console.log("🧪 TEST EVENT RECEIVED:", data);
  alert("Socket connection works! " + data.message);
});
```

**Upload a video and wait 2 seconds:**

- If you see the alert → Socket connection works!
- If no alert → Socket connection issue

### 6. Check Environment Variables

#### Backend (.env)

```bash
PORT=5000
JWT_SECRET=your_secret
NODE_ENV=development
```

#### Frontend (.env)

```bash
VITE_API_URL=http://localhost:5000
```

**Run backend:**

```bash
cd backend
npm start
# Should show: Server running on port 5000
```

**Run frontend:**

```bash
cd frontend
npm run dev
# Should show: Local: http://localhost:5173
```

### 7. Quick Fix Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] `global.io` is set in server.js
- [ ] Socket connects when AIEditor loads
- [ ] Backend logs show "Emitting to room: user\_[userId]"
- [ ] Frontend logs show "Connected to server"
- [ ] userId format matches in socket and upload

### 8. Nuclear Option: Force Socket Connection

If nothing works, try forcing the socket connection with the actual userId:

**In Dashboard.jsx after upload:**

```javascript
const uploadedVideo = await uploadVideo(file, ...);

// Force socket connection with userId
const userId = localStorage.getItem("userId"); // Store this during login
if (userId) {
  socketService.emit("join_room", { userId });
}

navigate("/ai-editor", { state: { video: ... } });
```

**In backend chatSocket.js:**

```javascript
socket.on("join_room", (data) => {
  const roomName = `user_${data.userId}`;
  socket.join(roomName);
  logger.info(`Manual room join: ${roomName}`);
  socket.emit("room_joined", { room: roomName });
});
```

---

## Most Likely Issue

Based on the symptoms, the most likely issue is:

**Socket userId doesn't match req.user.id**

### Quick Check:

1. Upload a video
2. Check backend logs for both:
   - Socket connection: `🔌 User connected: ???`
   - Upload processing: `👤 User ID: ???`
3. If they don't match → That's the problem!

### Fix:

Ensure both use the same ID format. The issue is likely in how the JWT token stores the user ID vs how the User model exposes it.

**Check:**

- JWT payload: `{ userId: "123" }` or `{ userId: "user_123" }`?
- User.id: returns `"123"` or `"user_123"`?

Make them consistent!

---

## Still Not Working?

Add this to the top of `processVideoInBackground`:

```javascript
logger.info("🚨 DEBUGGING INFO:");
logger.info("Video ID:", videoId);
logger.info("User ID:", userId);
logger.info("Type of userId:", typeof userId);
logger.info("User ID value:", JSON.stringify(userId));

const io = global.io;
if (io) {
  const allRooms = io.sockets.adapter.rooms;
  logger.info("📋 All active rooms:", Array.from(allRooms.keys()));

  const targetRoom = `user_${userId}`;
  const roomSockets = allRooms.get(targetRoom);
  logger.info(
    `👥 Sockets in ${targetRoom}:`,
    roomSockets ? Array.from(roomSockets) : "NONE"
  );
}
```

This will show you exactly which rooms exist and which sockets are in them.
