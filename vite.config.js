import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// The Content-Security-Policy of the built app: scripts only from our own
// server, so an injected script can't run or send data elsewhere. Not in dev,
// where Vite's hot reload needs inline scripts.
function contentSecurityPolicy(api) {
  const socket = api.replace(/^http/, "ws");
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${api}`,
    "font-src 'self' data:",
    `connect-src 'self' data: blob: ${api} ${socket}`,
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "frame-src blob: https://www.openstreetmap.org",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: policy }, injectTo: "head-prepend" }],
  };
}

function apiOrigin(mode) {
  const base = loadEnv(mode, rootDir, "VITE_").VITE_API_BASE_URL;
  if (!base) throw new Error("VITE_API_BASE_URL is not set: add it to .env");
  return new URL(base).origin;
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), contentSecurityPolicy(apiOrigin(mode))],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv", "**/*.lottie"],
  build: {
    rollupOptions: {
      output: {
        // Libraries and English text change rarely: browsers keep them cached
        // across releases.
        manualChunks(id) {
          if (/node_modules[/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[/]/.test(id)) return "vendor-react";
          if (/locales[/]en\.js$/.test(id)) return "locale-en";
          return undefined;
        },
      },
    },
    // .lottie files are small zips: inlined as a data: URL, the dotLottie
    // player can't tell them from JSON and fails ("Failed to load animation
    // data"). Keep them as files.
    assetsInlineLimit: (file) => (file.endsWith(".lottie") ? false : undefined),
  },
}));
