import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      /**
       * Gunakan 'generateSW' agar Workbox otomatis generate sw.js
       * tanpa perlu kita tulis manual (lebih stabil, tidak ada bug inject).
       *
       * Kalau tetap mau pakai 'injectManifest', pastikan:
       * - File ada di src/sw.js
       * - Tidak ada syntax error di sw.js
       * - Tidak ada import yang gagal
       */
      strategies: "generateSW",

      registerType: "autoUpdate",
      injectRegister: "auto",

      // [Skilled] Web App Manifest lengkap agar PWA bisa diinstal
      manifest: {
        name: "RootFacts - AI Plant Recognition",
        short_name: "RootFacts",
        description: "Deteksi sayuran dengan AI dan dapatkan fakta menarik!",
        theme_color: "#10b981",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "id",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      // [Advanced] Workbox config
      workbox: {
        // Precache semua aset build + model TF lokal
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff,woff2}",
          "model/*.{json,bin}", // [Advanced] Model TensorFlow.js offline
        ],

        // Naikkan batas (model bisa besar)
        maximumFileSizeToCacheInBytes: 500 * 1024 * 1024,

        // SPA fallback
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],

        // Runtime caching untuk resource eksternal
        runtimeCaching: [
          // [Advanced] Cache model HuggingFace (Transformers.js)
          // NetworkFirst: coba internet dulu, fallback ke cache
          {
            urlPattern: /^https:\/\/(huggingface\.co|.*\.hf\.co)\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "hf-model-cache-v1",
              networkTimeoutSeconds: 60,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cache file ONNX
          {
            urlPattern: /\.(onnx|onnx_data)$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "onnx-cache-v1",
              networkTimeoutSeconds: 60,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cache Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-v1",
              expiration: { maxEntries: 10 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // SW hanya aktif di production build
      devOptions: {
        enabled: false,
      },
    }),
  ],

  build: {
    target: "esnext",
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        manualChunks: {
          tensorflow: ["@tensorflow/tfjs"],
          transformers: ["@xenova/transformers"],
        },
      },
    },
  },

  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },

  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
