import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: {
    // The PDF and DOCX parsers are loaded on demand, so a large lazy chunk is expected.
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
      "/health": "http://localhost:8787",
    },
  },
});
