import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          ui: ["lucide-react", "framer-motion"],
          video: ["video.js", "wavesurfer.js"],
          fabric: ["fabric"],
          utils: ["zustand", "@tanstack/react-query"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
  },
  server: {
    port: 4000,
    proxy: {
      // REST API
      "/api": { target: "http://localhost:3001", changeOrigin: true },

      // Socket.IO (websockets)
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
      },
      // (optional) static files served by backend (if any)
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
