import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv", "**/*.lottie"],
  build: {
    // .lottie files are small zips: inlined as a data: URL, the dotLottie
    // player can't tell them from JSON and fails ("Failed to load animation
    // data"). Keep them as files.
    assetsInlineLimit: (file) => (file.endsWith(".lottie") ? false : undefined),
  },
});
