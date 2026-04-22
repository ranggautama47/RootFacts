import { pipeline, env } from "@xenova/transformers";

// ══════════════════════════════════════════════════════════════════════════════
// KONFIGURASI OFFLINE — WAJIB SEBELUM APAPUN
// ══════════════════════════════════════════════════════════════════════════════

// 1. Izinkan download model dari HuggingFace (saat online pertama kali)
env.allowRemoteModels = true;

// 2. Nonaktifkan model lokal agar tidak konflik dengan path browser
env.allowLocalModels = false;

// 3. Gunakan cache browser — model hanya diunduh SEKALI, lalu offline
env.useBrowserCache = true;

// 4. [FIX UTAMA] Arahkan WASM ke folder lokal (/public/wasm/)
//    Ini menghentikan request ke cdn.jsdelivr.net saat offline
//    WASM harus disalin dulu: jalankan `node copy-wasm.js`
env.backends.onnx.wasm.wasmPaths = "/wasm/";

// 5. Nonaktifkan multi-threading jika tidak ada COOP/COEP header
//    (aman untuk semua browser, performa sedikit lebih lambat tapi stabil)
env.backends.onnx.wasm.numThreads = 1;

// ══════════════════════════════════════════════════════════════════════════════

export const TONE_CONFIG = {
  defaultTone: "normal",
  tones: {
    normal: {
      label: "📖 Normal",
      prefix: "Tell me one interesting fact about",
      suffix: "Answer in Indonesian language.",
    },
    lucu: {
      label: "😂 Lucu",
      prefix: "Tell me one funny fact about",
      suffix: "Answer in Indonesian language with humor.",
    },
    profesional: {
      label: "💼 Profesional",
      prefix: "Tell me one scientific nutritional fact about",
      suffix: "Answer in Indonesian language, be professional.",
    },
    sejarah: {
      label: "🏛️ Sejarah",
      prefix: "Tell me one historical fact about the origin of",
      suffix: "Answer in Indonesian language.",
    },
    anak: {
      label: "🧒 Anak-anak",
      prefix: "Explain one fun fact about",
      suffix: "in simple Indonesian words for children.",
    },
  },
};

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.currentTone = TONE_CONFIG.defaultTone;
    this.currentBackend = null;
  }

  /**
   * [Basic] Muat model Transformers.js
   * [Advanced] Backend Adaptif: WebGPU → WASM (self-hosted)
   */
  async loadModel(onProgress = null) {
    try {
      if (onProgress) onProgress(5, "Mendeteksi perangkat...");

      const device = await this._detectBestDevice();
      this.currentBackend = device;
      console.log(`[RootFactsService] Device: ${device}`);

      if (onProgress) onProgress(8, "Memulai unduhan model AI...");

      const MODEL_ID = "Xenova/flan-t5-small";
      const TASK = "text2text-generation";

      // Track progress per file agar total lebih akurat
      const fileProgress = {};

      this.generator = await pipeline(TASK, MODEL_ID, {
        device: device,
        progress_callback: (info) => {
          if (!info || !info.status) return;

          const status = info.status;
          const file = info.file || "model";

          if (status === "initiate") {
            fileProgress[file] = 0;
            if (onProgress) onProgress(10, `Mempersiapkan: ${file}`);
          } else if (status === "download") {
            fileProgress[file] = 0;
            if (onProgress) onProgress(12, `Mengunduh: ${file}`);
          } else if (status === "progress") {
            const loaded = info.loaded || 0;
            const total = info.total || 0;

            if (total > 0) {
              fileProgress[file] = loaded / total;
            } else {
              const loadedMB = loaded / 1024 / 1024;
              fileProgress[file] = Math.min(0.95, loadedMB / 80);
            }

            const files = Object.values(fileProgress);
            const avgProgress =
              files.length > 0
                ? files.reduce((a, b) => a + b, 0) / files.length
                : 0;

            const totalPct = Math.round(12 + avgProgress * 78);
            const loadedMB = (info.loaded / 1024 / 1024).toFixed(1);
            const totalMB = info.total
              ? (info.total / 1024 / 1024).toFixed(1)
              : "?";

            const msg = info.total
              ? `Mengunduh model... ${loadedMB}/${totalMB} MB`
              : `Mengunduh model... ${loadedMB} MB`;

            if (onProgress) onProgress(totalPct, msg);
          } else if (status === "done") {
            fileProgress[file] = 1;
            if (onProgress) onProgress(90, `Selesai: ${file}`);
          } else if (status === "loading" || status === "loaded") {
            if (onProgress) onProgress(95, "Memuat model ke memori...");
          } else if (status === "ready") {
            if (onProgress) onProgress(100, "Model AI siap!");
          }
        },
      });

      this.isModelLoaded = true;
      if (onProgress) onProgress(100, "Model AI siap!");
      console.log("[RootFactsService] Model dimuat:", MODEL_ID);
      return true;
    } catch (error) {
      this.isModelLoaded = false;
      console.error("[RootFactsService] Gagal:", error);

      const msg = error.message || "";

      if (msg.includes("no available backend") || msg.includes("WASM")) {
        throw new Error(
          "File WASM tidak ditemukan di /public/wasm/. " +
            "Jalankan: node copy-wasm.js lalu build ulang.",
        );
      }
      if (msg.includes("Unexpected token") || msg.includes("<!doctype")) {
        throw new Error(
          "Cache lama bermasalah. Buka DevTools → Application → " +
            "Storage → Clear site data, lalu Ctrl+Shift+R.",
        );
      }
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        throw new Error(
          "Gagal mengunduh model. Periksa koneksi internet " +
            "(diperlukan saat pertama kali).",
        );
      }
      throw error;
    }
  }

  /**
   * [Advanced] Deteksi device terbaik: WebGPU → WASM
   */
  async _detectBestDevice() {
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          console.log("[RootFactsService] WebGPU ✓");
          return "webgpu";
        }
      } catch (e) {
        console.warn("[RootFactsService] WebGPU gagal:", e.message);
      }
    }
    // WASM sekarang self-hosted → aman offline
    console.log("[RootFactsService] Menggunakan WASM (self-hosted) ✓");
    return "wasm";
  }

  /** [Advanced] Set tone/persona */
  setTone(tone) {
    if (TONE_CONFIG.tones[tone]) {
      this.currentTone = tone;
    }
  }

  /**
   * [Basic+Skilled+Advanced] Generate fakta
   */
  async generateFacts(vegetableName) {
    if (!this.isReady()) throw new Error("Model AI belum siap.");
    if (this.isGenerating) return null;

    this.isGenerating = true;
    try {
      const toneConf = TONE_CONFIG.tones[this.currentTone];
      const prompt = `${toneConf.prefix} ${vegetableName}. ${toneConf.suffix}`;

      console.log(
        `[RootFactsService] Generate: "${vegetableName}" [${this.currentTone}]`,
      );

      // [Skilled] Parameter generasi yang dikonfigurasi
      const output = await this.generator(prompt, {
        max_new_tokens: 150,
        temperature: 0.85,
        top_p: 0.92,
        do_sample: true,
        repetition_penalty: 1.3,
      });

      let text = "";
      if (Array.isArray(output) && output.length > 0) {
        text = output[0]?.generated_text || output[0]?.translation_text || "";
      }

      text = text
        .replace(/^(Fakta:|Jawaban:|Answer:|Fact:)\s*/i, "")
        .replace(/\n+/g, " ")
        .trim();

      return (
        text || `${vegetableName} adalah sayuran bergizi yang kaya manfaat!`
      );
    } finally {
      this.isGenerating = false;
    }
  }

  isReady() {
    return this.isModelLoaded && this.generator !== null && !this.isGenerating;
  }
}
