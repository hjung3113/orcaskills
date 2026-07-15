import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist/renderer" },
  server: {
    host: "0.0.0.0",
    proxy: { "/api": { target: "http://127.0.0.1:4317", changeOrigin: true } },
  },
});
