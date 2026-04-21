/**
 * RootFactsService.js
 *
 * Menggunakan @xenova/transformers untuk generasi teks fun fact.
 *
 * MODEL YANG DIGUNAKAN:
 * - 'Xenova/LaMini-Flan-T5-248M' (text2text-generation, ~248MB, PASTI ADA di HuggingFace)
 *
 * Jika masih error, ganti ke model lebih kecil:
 * - 'Xenova/flan-t5-small' (~80MB)
 *
 * Error "Unexpected token '<'" = model tidak ditemukan / dapat 404 HTML.
 * Solusi: pastikan model ID benar persis, huruf besar-kecil sensitif.
 */

import { pipeline, env } from '@xenova/transformers';

// Konfigurasi Transformers.js
env.allowRemoteModels = true;   // izinkan download dari HuggingFace
env.allowLocalModels = false;   // nonaktifkan lokal agar tidak konflik
env.useBrowserCache = true;     // simpan di cache browser (offline setelah pertama)

export const TONE_CONFIG = {
    defaultTone: 'normal',
    tones: {
        normal: {
            label: '📖 Normal',
            prefix: 'Share an interesting fact about',
            suffix: 'in Indonesian language. Be informative and clear.',
        },
        lucu: {
            label: '😂 Lucu',
            prefix: 'Share a funny and entertaining fact about',
            suffix: 'in Indonesian language. Be humorous and playful.',
        },
        profesional: {
            label: '💼 Profesional',
            prefix: 'Share a scientific nutritional fact about',
            suffix: 'in Indonesian language. Be professional and data-driven.',
        },
        sejarah: {
            label: '🏛️ Sejarah',
            prefix: 'Share a historical origin fact about',
            suffix: 'in Indonesian language. Focus on history and culture.',
        },
        anak: {
            label: '🧒 Anak-anak',
            prefix: 'Explain a fun fact about',
            suffix: 'in Indonesian language using simple words for children.',
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
     * [Advanced] Backend Adaptif: WebGPU → WASM
     *
     * @param {Function} onProgress - callback(percent, message)
     */
    async loadModel(onProgress = null) {
        try {
            if (onProgress) onProgress(5, 'Mendeteksi perangkat...');

            // [Advanced] Deteksi device terbaik
            const device = await this._detectBestDevice();
            this.currentBackend = device;
            console.log(`[RootFactsService] Menggunakan device: ${device}`);

            if (onProgress) onProgress(10, 'Memulai unduhan model AI...');

            /**
             * Model yang PASTI ADA di HuggingFace CDN:
             *
             * OPSI 1 (Direkomendasikan - lebih akurat untuk instruksi):
             *   Model  : 'Xenova/LaMini-Flan-T5-248M'
             *   Task   : 'text2text-generation'
             *   Ukuran : ~248MB
             *
             * OPSI 2 (Lebih kecil - cocok untuk koneksi lambat):
             *   Model  : 'Xenova/flan-t5-small'
             *   Task   : 'text2text-generation'
             *   Ukuran : ~80MB
             *
             * OPSI 3 (Paling kecil - darurat):
             *   Model  : 'Xenova/distilgpt2'
             *   Task   : 'text-generation'
             *   Ukuran : ~40MB
             */
            const MODEL_ID = 'Xenova/LaMini-Flan-T5-248M';
            const TASK = 'text2text-generation';

            this.generator = await pipeline(TASK, MODEL_ID, {
                device: device,
                progress_callback: (info) => {
                    if (info.status === 'downloading') {
                        const loaded = info.loaded || 0;
                        const total = info.total || 1;
                        const pct = Math.round(10 + (loaded / total) * 80);
                        const loadedMB = (loaded / 1024 / 1024).toFixed(1);
                        const totalMB = (total / 1024 / 1024).toFixed(1);
                        if (onProgress) {
                            onProgress(pct, `Mengunduh model AI... ${loadedMB}/${totalMB} MB`);
                        }
                    } else if (info.status === 'loading') {
                        if (onProgress) onProgress(92, 'Memuat model ke memori...');
                    } else if (info.status === 'ready') {
                        if (onProgress) onProgress(100, 'Model AI siap!');
                    }
                },
            });

            this.isModelLoaded = true;
            if (onProgress) onProgress(100, 'Model AI siap!');
            console.log('[RootFactsService] Model berhasil dimuat:', MODEL_ID);
            return true;
        } catch (error) {
            this.isModelLoaded = false;
            console.error('[RootFactsService] Gagal memuat model:', error);

            // Pesan error yang lebih informatif
            if (error.message && error.message.includes('Unexpected token')) {
                throw new Error(
                    'Model AI tidak ditemukan. Periksa koneksi internet dan pastikan URL model benar.'
                );
            }
            throw error;
        }
    }

    /**
     * [Advanced] Deteksi device terbaik: webgpu → wasm
     */
    async _detectBestDevice() {
        if (navigator.gpu) {
            try {
                const adapter = await navigator.gpu.requestAdapter();
                if (adapter) {
                    console.log('[RootFactsService] WebGPU tersedia ✓');
                    return 'webgpu';
                }
            } catch (e) {
                console.warn('[RootFactsService] WebGPU tidak tersedia:', e.message);
            }
        }
        console.log('[RootFactsService] Menggunakan WASM (CPU)');
        return 'wasm';
    }

    /**
     * [Advanced] Set tone/persona untuk generasi fakta
     * @param {string} tone - key dari TONE_CONFIG.tones
     */
    setTone(tone) {
        if (TONE_CONFIG.tones[tone]) {
            this.currentTone = tone;
            console.log(`[RootFactsService] Tone diubah ke: ${tone}`);
        }
    }

    /**
     * [Basic] Generate fun fact berdasarkan nama sayuran.
     * [Skilled] Parameter generasi dikonfigurasi.
     * [Advanced] Prompt berubah sesuai tone.
     *
     * @param {string} vegetableName
     * @returns {string|null}
     */
    async generateFacts(vegetableName) {
        if (!this.isReady()) {
            throw new Error('Model AI belum siap.');
        }

        if (this.isGenerating) {
            console.warn('[RootFactsService] Sedang memproses, permintaan diabaikan.');
            return null;
        }

        this.isGenerating = true;

        try {
            const toneConf = TONE_CONFIG.tones[this.currentTone];
            const prompt = `${toneConf.prefix} ${vegetableName}. ${toneConf.suffix}`;

            console.log(`[RootFactsService] Prompt: ${prompt}`);

            // [Skilled] Parameter generasi yang dikonfigurasi
            const output = await this.generator(prompt, {
                max_new_tokens: 150,   // batas token output
                temperature: 0.85,     // kreativitas (0=deterministik, 1=kreatif)
                top_p: 0.92,           // nucleus sampling
                do_sample: true,       // aktifkan sampling acak
                repetition_penalty: 1.3,
            });

            let text = '';
            if (Array.isArray(output) && output.length > 0) {
                text = output[0]?.generated_text
                    || output[0]?.translation_text
                    || '';
            }

            // Bersihkan artefak prompt dari output
            text = text
                .replace(/^(Fakta:|Jawaban:|Answer:|Fact:)/i, '')
                .replace(new RegExp(`^${vegetableName}[.:]?\\s*`, 'i'), '')
                .replace(/\n+/g, ' ')
                .trim();

            if (!text) {
                text = `${vegetableName} adalah sayuran bergizi yang kaya manfaat untuk kesehatan tubuh!`;
            }

            console.log('[RootFactsService] Fakta dihasilkan:', text);
            return text;
        } catch (error) {
            console.error('[RootFactsService] Error generate:', error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * [Basic] Cek apakah model siap
     */
    isReady() {
        return this.isModelLoaded && this.generator !== null && !this.isGenerating;
    }
}