import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendSrc = path.resolve(here, "../frontend/src");
const frontendPublic = path.resolve(here, "../frontend/public");
const apiTarget = process.env.VITE_API_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Share the existing front-end assets instead of duplicating them.
  publicDir: frontendPublic,
  resolve: {
    alias: [
      // Next-only imports are shimmed so the marketing components can be
      // reused verbatim while the rest of the app is migrated to the SPA.
      { find: /^next\/link$/, replacement: path.resolve(here, "src/shims/next-link.tsx") },
      { find: /^next\/image$/, replacement: path.resolve(here, "src/shims/next-image.tsx") },
      { find: /^next\/navigation$/, replacement: path.resolve(here, "src/shims/next-navigation.ts") },
      // Keep the same @/* import alias the existing source uses.
      { find: /^@\//, replacement: `${frontendSrc}/` },
    ],
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
