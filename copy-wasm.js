/**
 * copy-wasm.js
 *
 * Jalankan SEKALI setelah npm install:
 *   node copy-wasm.js
 *
 * Script ini menyalin semua file .wasm dari @xenova/transformers
 * ke folder public/wasm/ agar aplikasi bisa berjalan 100% offline
 * tanpa request ke cdn.jsdelivr.net
 */

import { copyFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_DIRS = [
  // @xenova/transformers dist folder
  join(__dirname, "node_modules", "@xenova", "transformers", "dist"),
  // onnxruntime-web dist folder (diperlukan oleh transformers)
  join(__dirname, "node_modules", "onnxruntime-web", "dist"),
];

const DEST_DIR = join(__dirname, "public", "wasm");

// Buat folder tujuan jika belum ada
if (!existsSync(DEST_DIR)) {
  mkdirSync(DEST_DIR, { recursive: true });
  console.log("✅ Folder public/wasm/ dibuat");
}

let copiedCount = 0;

for (const srcDir of SOURCE_DIRS) {
  if (!existsSync(srcDir)) {
    console.log(`⚠️  Folder tidak ditemukan: ${srcDir}`);
    continue;
  }

  const files = readdirSync(srcDir);
  const wasmFiles = files.filter(
    (f) => f.endsWith(".wasm") || f.endsWith(".mjs"),
  );

  for (const file of wasmFiles) {
    const src = join(srcDir, file);
    const dest = join(DEST_DIR, file);
    try {
      copyFileSync(src, dest);
      console.log(`✅ Disalin: ${file}`);
      copiedCount++;
    } catch (e) {
      console.log(`❌ Gagal salin ${file}: ${e.message}`);
    }
  }
}

if (copiedCount === 0) {
  console.log("\n❌ Tidak ada file WASM yang disalin!");
  console.log("Pastikan sudah menjalankan: npm install");
  console.log("Dan pastikan @xenova/transformers ada di node_modules/");
} else {
  console.log(`\n✅ Selesai! ${copiedCount} file disalin ke public/wasm/`);
  console.log("Sekarang aplikasi bisa berjalan offline tanpa CDN.");
}
