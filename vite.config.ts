import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Mirrors the Nginx rewrites so `npm run dev` talks to the mock API the same
// way the container does.
const apiProxy = (target: string, prefix: string) => ({
  target,
  rewrite: (path: string) => path.replace(prefix, "/api/v1"),
});

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Al Colegio en Bici",
        short_name: "ACB",
        description:
          "Operación de Al Colegio en Bici para guías, líderes zonales y gerencia.",
        lang: "es-CO",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#10151c",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Only the app shell is precached: API responses and map tiles always
        // go to the network.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    proxy: {
      "/api/admin": apiProxy("http://localhost:4001", "/api/admin"),
      "/api/geo": apiProxy("http://localhost:4002", "/api/geo"),
    },
  },
});
