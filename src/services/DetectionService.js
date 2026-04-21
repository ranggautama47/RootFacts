import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // WAJIB ADA
import "@tensorflow/tfjs-backend-webgpu"; // WAJIB ADA

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
    this.currentBackend = null;
  }

  /**
   * [Basic] Muat model TensorFlow.js dan metadata label.
   * [Advanced] Backend Adaptif: WebGPU → WebGL → CPU
   */
  async loadModel(
    modelUrl = "/model/model.json",
    metadataUrl = "/model/metadata.json",
    onProgress = null,
  ) {
    try {
      // [Advanced] Setup backend DULU, baru lakukan hal lain
      await this._setupAdaptiveBackend();

      console.log(`[DetectionService] Backend aktif: ${tf.getBackend()}`);
      this.currentBackend = tf.getBackend();

      // Muat label dari metadata
      if (onProgress) onProgress(10, "Memuat metadata...");
      const metaResponse = await fetch(metadataUrl);
      if (!metaResponse.ok) {
        throw new Error(`Gagal memuat metadata: ${metaResponse.status}`);
      }
      const metadata = await metaResponse.json();
      this.labels = metadata.labels || [];

      // Muat model TensorFlow.js
      if (onProgress) onProgress(30, "Memuat model...");
      this.model = await tf.loadLayersModel(modelUrl, {
        onProgress: (fraction) => {
          const percent = Math.round(30 + fraction * 60);
          if (onProgress) {
            onProgress(
              percent,
              `Mengunduh model... ${Math.round(fraction * 100)}%`,
            );
          }
        },
      });

      // Warm-up: jalankan prediksi dummy agar model siap
      if (onProgress) onProgress(95, "Mempersiapkan model...");
      tf.tidy(() => {
        const dummyInput = tf.zeros([1, 224, 224, 3]);
        this.model.predict(dummyInput);
      });

      if (onProgress) onProgress(100, "Model siap!");
      console.log(
        "[DetectionService] Model berhasil dimuat. Labels:",
        this.labels,
      );
      return true;
    } catch (error) {
      console.error("[DetectionService] Gagal memuat model:", error);
      throw error;
    }
  }

  /**
   * [Advanced] Setup backend adaptif dengan urutan yang benar:
   * 1. Set backend
   * 2. await tf.ready() — WAJIB sebelum operasi apapun
   * 3. Baru lanjut ke langkah selanjutnya
   */
  async _setupAdaptiveBackend() {
    // Coba WebGL terlebih dahulu (lebih stabil)
    try {
      await tf.setBackend("webgl");
      await tf.ready(); // WAJIB setelah setBackend
      console.log("[DetectionService] Menggunakan backend: WebGL ✓");
      return;
    } catch (e) {
      console.warn(
        "[DetectionService] WebGL gagal, mencoba WebGPU:",
        e.message,
      );
    }

    // Fallback ke WebGPU jika WebGL gagal
    if (navigator.gpu) {
      try {
        await tf.setBackend("webgpu");
        await tf.ready(); // WAJIB setelah setBackend
        console.log("[DetectionService] Menggunakan backend: WebGPU ✓");
        return;
      } catch (e) {
        console.warn(
          "[DetectionService] WebGPU gagal, fallback ke CPU:",
          e.message,
        );
      }
    }

    // Fallback terakhir CPU
    await tf.setBackend("cpu");
    await tf.ready(); // WAJIB setelah setBackend
    console.log("[DetectionService] Menggunakan backend: CPU (fallback)");
  }

  /**
   * [Basic] Prediksi pada elemen gambar.
   * [Advanced] Manajemen memori dengan tf.tidy()
   */
  async predict(imageElement) {
    if (!this.isLoaded() || !imageElement) return null;

    let result = null;

    try {
      // tf.tidy() membersihkan semua tensor perantara secara otomatis
      result = tf.tidy(() => {
        const tensor = tf.browser
          .fromPixels(imageElement)
          .resizeBilinear([224, 224])
          .expandDims(0)
          .div(tf.scalar(255.0));

        const predictions = this.model.predict(tensor);
        const probabilities = predictions.dataSync();

        let maxIndex = 0;
        let maxProb = 0;
        for (let i = 0; i < probabilities.length; i++) {
          if (probabilities[i] > maxProb) {
            maxProb = probabilities[i];
            maxIndex = i;
          }
        }

        return {
          label: this.labels[maxIndex] || `Class_${maxIndex}`,
          confidence: Math.round(maxProb * 100),
          allProbabilities: Array.from(probabilities),
          backend: this.currentBackend,
        };
      });
    } catch (error) {
      console.error("[DetectionService] Error saat prediksi:", error);
      return null;
    }

    return result;
  }

  /**
   * [Basic] Cek apakah model sudah dimuat
   */
  isLoaded() {
    return this.model !== null && this.labels.length > 0;
  }

  /**
   * Bersihkan model dari memori
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      console.log("[DetectionService] Model dibersihkan dari memori");
    }
  }
}
