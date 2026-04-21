/**
 * sw.js — Service Worker (src/sw.js)
 *
 * Fix untuk error:
 * - "Failed to execute 'match' on 'CacheStorage'" → terjadi karena route
 *   handler mencoba cache sebelum SW fully activated
 * - Model HuggingFace diblokir SW → exclude dari precache, biarkan
 *   network-first agar model bisa diunduh bebas
 */

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  StaleWhileRevalidate,
  NetworkOnly,
  NetworkFirst,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// ── Precache aset build (HTML, CSS, JS, icons) ────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── [Advanced] Model TensorFlow.js lokal (public/model/) ─────────────────────
registerRoute(
  ({ url }) => url.pathname.startsWith("/model/"),
  new CacheFirst({
    cacheName: "tensorflow-model-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);

// ── [Advanced] File .bin weight model ────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.pathname.endsWith(".bin") && url.origin === self.location.origin,
  new CacheFirst({
    cacheName: "tensorflow-model-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);

// ── [Advanced] Model HuggingFace — NetworkFirst agar tidak terblokir ──────────
// Gunakan NetworkFirst (bukan CacheFirst) agar model selalu bisa diunduh,
// lalu disimpan untuk offline setelah pertama kali berhasil
registerRoute(
  ({ url }) =>
    url.hostname === "huggingface.co" ||
    url.hostname.endsWith(".hf.co") ||
    url.pathname.endsWith(".onnx") ||
    url.pathname.endsWith(".onnx_data"),
  new NetworkFirst({
    cacheName: "hf-model-cache-v1",
    networkTimeoutSeconds: 60, // timeout 60 detik untuk file besar
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);

// ── Font Google ───────────────────────────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10 }),
    ],
  }),
);

// ── Aset statis (gambar, ikon lokal) ─────────────────────────────────────────
registerRoute(
  ({ request, url }) =>
    (request.destination === "image" || request.destination === "font") &&
    url.origin === self.location.origin,
  new StaleWhileRevalidate({
    cacheName: "static-assets-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50 }),
    ],
  }),
);

// ── Navigasi SPA ──────────────────────────────────────────────────────────────
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages-cache-v1",
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

// ── Skip waiting & claim clients ──────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
