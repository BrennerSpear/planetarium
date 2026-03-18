import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
  },
  server: {
    host: "0.0.0.0",
  },
});
