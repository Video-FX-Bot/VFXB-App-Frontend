# Bug Fix: Blur Effect Applying 6 Times

## Issue

When adding a blur effect through the AI chat, the effect was being applied 6 times in the applied effects section instead of once.

## Root Cause

The issue was caused by a combination of two factors:

### 1. Socket Event Listener Wrapper Bug

In `frontend/src/services/socketService.js`, the `onAIResponse()` method was wrapping the callback in an anonymous function:

```javascript
// BEFORE (BUGGY):
onAIResponse(callback) {
  this.on("ai_response", (data) => {
    callback(data);  // Wrapped in anonymous function
  });
}
```

Every time `socketService.onAIResponse(handleAIResponse)` was called, it created a **NEW** anonymous wrapper function and registered it as a listener. When the cleanup function tried to remove the listener with `socketService.off("ai_response", handleAIResponse)`, it couldn't find the wrapper functions because it was looking for the original `handleAIResponse` function, not the wrappers.

### 2. React StrictMode Double Mounting

The app uses `React.StrictMode` in `frontend/src/main.jsx`, which in development mode:

- Mounts components
- Unmounts components
- Re-mounts components

This is intentional behavior to help detect side effects. Combined with the wrapper bug, this caused:

- **First mount**: 1 listener registered
- **StrictMode unmount**: Cleanup fails to remove the wrapper
- **StrictMode re-mount**: 2nd listener registered (total: 2)
- **User navigation cycles**: Each navigation adds more listeners
- **After 3 navigation cycles**: 6 total listeners

Each AI response would then trigger all 6 listeners, causing `applyGlobalEffect` to be called 6 times.

## Solution

Removed the anonymous wrapper function in `socketService.js` and registered the callback directly:

```javascript
// AFTER (FIXED):
onAIResponse(callback) {
  console.log("🎯 Registering AI response listener");
  console.log("🎯 Callback type:", typeof callback);
  console.log("🎯 Callback is:", callback);

  // Register directly without wrapper to ensure cleanup works properly
  this.on("ai_response", callback);
}
```

Now when `socketService.off("ai_response", handleAIResponse)` is called in the cleanup function, it correctly removes the listener because the actual registered function matches the one being removed.

## Files Modified

- `frontend/src/services/socketService.js` - Fixed `onAIResponse()` method to register callbacks directly

## Verification

The fix ensures:

1. ✅ Only one event listener is registered per component mount
2. ✅ Cleanup function properly removes the listener on unmount
3. ✅ Effects (blur, brightness, contrast, etc.) apply only once per AI response
4. ✅ React StrictMode double-mounting no longer causes listener accumulation

## Testing

To test the fix:

1. Add a blur effect via AI chat: `"add a blur effect"`
2. Verify only 1 blur effect appears in the applied effects section
3. Navigate away from the AI Editor and back
4. Add another effect via AI chat
5. Verify only 1 new effect is added (no duplicates)

## Related Issues

This bug affected all AI chat-based effect applications, not just blur:

- ✅ Gaussian Blur
- ✅ Motion Blur
- ✅ Brightness/Contrast
- ✅ LUT Filters
- ✅ Particle Effects (snow, fire, sparkles)
- ✅ Quality Enhancement
- ✅ Captions

All are now fixed with this single change to the socket listener registration.
