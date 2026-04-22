import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: "auto",

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

      workbox: {
        globPatterns: [
          // Aset build standar
          "**/*.{js,css,html,ico,png,svg}",
          // [FIX OFFLINE] File WASM self-hosted (transformers.js)
          "wasm/*.{wasm,mjs}",
          // [Advanced] Model TF.js lokal
          "model/*.{json,bin}",
          // Font lokal (jika ada)
          "fonts/*.{woff,woff2,ttf}",
        ],

        // Naikkan limit — file WASM dan model bisa besar
        maximumFileSizeToCacheInBytes: 500 * 1024 * 1024,

        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          // [Advanced] Model HuggingFace — NetworkFirst
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
          // [Advanced] File ONNX dari CDN
          {
            urlPattern: /\.(onnx|onnx_data)$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "onnx-cache-v1",
              networkTimeoutSeconds: 60,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts (opsional — sudah ada font lokal di index.css)
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

      devOptions: { enabled: false },
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
