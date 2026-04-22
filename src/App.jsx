import { useRef, useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import CameraSection from "./components/CameraSection";
import InfoPanel from "./components/InfoPanel";
import useOnlineStatus from "./hooks/useOnlineStatus";
import { useAppState } from "./hooks/useAppState";
import { CameraService } from "./services/CameraService";
import { DetectionService } from "./services/DetectionService";
import { RootFactsService, TONE_CONFIG } from "./services/RootFactsService";
import Swal from "sweetalert2";

const MODEL_URL = "/model/model.json";
const METADATA_URL = "/model/metadata.json";
const CONFIDENCE_THRESHOLD = 70;
const FACT_COOLDOWN_MS = 8000;

const TONE_OPTIONS = Object.entries(TONE_CONFIG.tones).map(
  ([value, config]) => ({
    value,
    label: config.label,
  }),
);

// ── Helper: render HTML progress untuk SweetAlert ────────────────────────────
function buildProgressHTML(title, message, percent) {
  const safePercent = Math.min(100, Math.max(0, percent));
  return `
        <div style="text-align:left;padding:4px 0">
            <p style="margin:0 0 6px;font-weight:600;font-size:14px">${title}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#555">${message}</p>
            <div style="background:#e5e7eb;border-radius:8px;overflow:hidden;height:10px">
                <div style="
                    width:${safePercent}%;
                    background:linear-gradient(90deg,#10b981,#059669);
                    height:10px;
                    transition:width 0.3s ease;
                    border-radius:8px;
                "></div>
            </div>
            <p style="margin:6px 0 0;font-size:12px;color:#6b7280;text-align:right">${safePercent}%</p>
        </div>
    `;
}

function App() {
  const { state, actions } = useAppState();
  const isOnline = useOnlineStatus();

  // ── Refs ─────────────────────────────────────────────────────────────────
  const detectionCleanupRef = useRef(null);
  const isRunningRef = useRef(false);
  const lastFactTimeRef = useRef(0);
  const lastLabelRef = useRef("");
  const animFrameRef = useRef(null);
  // [FIX #2] Ref untuk mengunci label saat sedang generate fakta
  const lockedLabelRef = useRef("");
  const isGeneratingRef = useRef(false);

  const [currentTone, setCurrentTone] = useState(TONE_CONFIG.defaultTone);

  const cameraServiceRef = useRef(new CameraService());
  const detectionServiceRef = useRef(new DetectionService());
  const factsServiceRef = useRef(new RootFactsService());

  const cleanup = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (detectionCleanupRef.current) {
      detectionCleanupRef.current();
      detectionCleanupRef.current = null;
    }
    cameraServiceRef.current.stopCamera();
    if (detectionServiceRef.current.dispose) {
      detectionServiceRef.current.dispose();
    }
  }, []);

  // ── [Basic] Inisialisasi layanan ─────────────────────────────────────────
  useEffect(() => {
    const initServices = async () => {
      try {
        actions.setAppState("initializing");
        actions.setModelStatus({ cv: "loading", ai: "loading" });
        actions.setServices({
          camera: cameraServiceRef.current,
          detection: detectionServiceRef.current,
          facts: factsServiceRef.current,
        });

        // ── Buka SweetAlert loading sekali ──────────────────────────
        Swal.fire({
          title: "🌿 Memuat RootFacts...",
          html: buildProgressHTML("Model CV", "Memulai...", 0),
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => Swal.showLoading(),
        });

        // ── [FIX #1] Muat model CV dengan progress real-time ────────
        // Root cause stuck 10%: progress callback dari tf.loadLayersModel
        // hanya dipanggil saat file .bin selesai diunduh, bukan per-byte.
        // Solusi: tampilkan animasi indeterminate + persentase dari callback.
        await detectionServiceRef.current.loadModel(
          MODEL_URL,
          METADATA_URL,
          (percent, message) => {
            actions.setModelStatus((prev) => ({
              ...prev,
              cv: percent < 100 ? "loading" : "ready",
              cvProgress: percent,
              cvMessage: message,
            }));
            // Update SweetAlert real-time
            Swal.update({
              html: buildProgressHTML(
                "🧠 Model Deteksi (CV)",
                message,
                percent,
              ),
            });
          },
        );
        actions.setModelStatus((prev) => ({
          ...prev,
          cv: "ready",
          cvProgress: 100,
        }));

        // ── Muat model AI dengan progress real-time ──────────────────
        await factsServiceRef.current.loadModel((percent, message) => {
          actions.setModelStatus((prev) => ({
            ...prev,
            ai: percent < 100 ? "loading" : "ready",
            aiProgress: percent,
            aiMessage: message,
          }));
          // Update SweetAlert real-time
          Swal.update({
            html: buildProgressHTML(
              "🤖 Model AI (Fun Facts)",
              message,
              percent,
            ),
          });
        });
        actions.setModelStatus((prev) => ({
          ...prev,
          ai: "ready",
          aiProgress: 100,
        }));

        actions.setAppState("ready");
        console.log("[App] Semua model berhasil dimuat!");

        // ── Tutup loading & tampilkan sukses ────────────────────────
        await Swal.fire({
          icon: "success",
          title: "Siap Digunakan! 🚀",
          text: "Semua model AI berhasil dimuat.",
          timer: 1800,
          showConfirmButton: false,
          timerProgressBar: true,
        });
      } catch (error) {
        console.error("[App] Error inisialisasi:", error);
        actions.setError(`Gagal memuat model: ${error.message}`);
        actions.setAppState("error");

        Swal.fire({
          icon: "error",
          title: "Gagal Memuat Model",
          html: `
                        <p>${error.message}</p>
                        <p style="font-size:12px;color:#6b7280;margin-top:8px">
                            Coba: Unregister SW → Clear Storage → Hard Refresh (Ctrl+Shift+R)
                        </p>
                    `,
          confirmButtonText: "Muat Ulang",
          confirmButtonColor: "#10b981",
        }).then((result) => {
          if (result.isConfirmed) window.location.reload();
        });
      }
    };

    initServices();
    return () => cleanup();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── [FIX #2] Loop deteksi — stop setelah confident detect ───────────────
  const startDetectionLoop = useCallback(
    (videoElement) => {
      const camera = cameraServiceRef.current;
      const detection = detectionServiceRef.current;
      const facts = factsServiceRef.current;

      camera.setFPS(15);

      const loop = async () => {
        if (!isRunningRef.current) return;

        // Jika sedang generate fakta, PAUSE loop (tidak proses frame baru)
        // Ini mencegah label tertimpa sebelum fakta selesai dibuat
        if (isGeneratingRef.current) {
          animFrameRef.current = requestAnimationFrame(loop);
          return;
        }

        if (
          camera.shouldProcessFrame() &&
          camera.isReady() &&
          detection.isLoaded()
        ) {
          try {
            const result = await detection.predict(videoElement);

            if (result) {
              const now = Date.now();
              const isNewLabel = result.label !== lastLabelRef.current;
              const isCooldownDone =
                now - lastFactTimeRef.current > FACT_COOLDOWN_MS;
              const isConfident = result.confidence >= CONFIDENCE_THRESHOLD;

              // ✅ tampilkan hasil ke UI
              actions.setDetectionResult(result);
              actions.setAppState("result");

              // 🔥 FIX UTAMA: STOP kamera saat confident
              if (
                isConfident &&
                facts.isReady() &&
                (isNewLabel || isCooldownDone)
              ) {
                // 🚨 STOP LOOP + CAMERA (WAJIB)
                isRunningRef.current = false;

                if (animFrameRef.current) {
                  cancelAnimationFrame(animFrameRef.current);
                  animFrameRef.current = null;
                }

                camera.stopCamera();
                actions.setIsRunning(false);

                // 🔒 LOCK label
                const labelToGenerate = result.label;
                lastLabelRef.current = labelToGenerate;
                lockedLabelRef.current = labelToGenerate;
                lastFactTimeRef.current = now;
                isGeneratingRef.current = true;

                // tampilkan loading fakta
                actions.setFunFactData({
                  text: null,
                  isLoading: true,
                  label: labelToGenerate,
                });

                try {
                  const factText = await facts.generateFacts(labelToGenerate);

                  actions.setFunFactData({
                    text: factText,
                    isLoading: false,
                    label: labelToGenerate,
                  });
                } catch (e) {
                  actions.setFunFactData({
                    text: null,
                    isLoading: false,
                    error: e.message,
                    label: labelToGenerate,
                  });
                } finally {
                  isGeneratingRef.current = false;
                }

                // 🚨 FIX 1: TAMBAHKAN RETURN DI SINI!
                // Ini memastikan fungsi langsung keluar setelah fakta selesai digenerate
                // dan TIDAK membaca kode requestAnimationFrame di bagian bawah.
                return;
              }
            }
          } catch (err) {
            console.error("[App] Error loop deteksi:", err);
          }
        }

        // 🚨 FIX 2: BUNGKUS requestAnimationFrame DENGAN GUARD (PALING AMAN)
        // Jadi kalau di tengah proses isRunningRef.current berubah jadi false,
        // frame berikutnya tidak akan pernah dijadwalkan.
        if (isRunningRef.current) {
          animFrameRef.current = requestAnimationFrame(loop);
        }
      };

      animFrameRef.current = requestAnimationFrame(loop);

      detectionCleanupRef.current = () => {
        isRunningRef.current = false;
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      };
    },
    [actions],
  );

  // ── [Basic] Toggle kamera ─────────────────────────────────────────────────
  const handleToggleCamera = useCallback(
    async (videoElement) => {
      const camera = cameraServiceRef.current;

      if (state.isRunning) {
        isRunningRef.current = false;
        isGeneratingRef.current = false;
        if (detectionCleanupRef.current) detectionCleanupRef.current();
        camera.stopCamera();
        actions.setIsRunning(false);
        actions.setAppState("idle");
        actions.setDetectionResult(null);
        actions.setFunFactData(null);
        lastLabelRef.current = "";
        lockedLabelRef.current = "";
      } else {
        try {
          actions.setAppState("analyzing");
          await camera.loadCameras();
          await camera.startCamera();
          isRunningRef.current = true;
          isGeneratingRef.current = false;
          actions.setIsRunning(true);
          actions.setError(null);
          startDetectionLoop(videoElement || camera.video);
        } catch (error) {
          console.error("[App] Gagal memulai kamera:", error);
          actions.setError(error.message);
          actions.setAppState("idle");
          isRunningRef.current = false;
        }
      }
    },
    [state.isRunning, actions, startDetectionLoop],
  );

  // ── [Advanced] Ubah tone ──────────────────────────────────────────────────
  const handleToneChange = useCallback(
    (newTone) => {
      setCurrentTone(newTone);
      factsServiceRef.current.setTone(newTone);
      lastFactTimeRef.current = 0;
      actions.setFunFactData(null);
    },
    [actions],
  );

  // ── [Skilled] Copy to clipboard dengan SweetAlert toast ──────────────────
  const handleCopyFact = useCallback(async () => {
    const text = state.funFactData?.text;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      actions.setCopyStatus("copied");
      setTimeout(() => actions.setCopyStatus("idle"), 2000);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "✅ Fakta berhasil disalin!",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error("[App] Gagal menyalin:", error);
      actions.setCopyStatus("error");
      setTimeout(() => actions.setCopyStatus("idle"), 2000);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "❌ Gagal menyalin",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  }, [state.funFactData, actions]);

  const getModelStatusString = () => {
    const { cv, ai, cvProgress, aiProgress, cvMessage, aiMessage } =
      state.modelStatus;
    if (cv === "loading")
      return cvMessage || `Memuat Model CV... ${cvProgress}%`;
    if (ai === "loading")
      return aiMessage || `Memuat Model AI... ${aiProgress}%`;
    if (cv === "ready" && ai === "ready") return "Model AI Siap";
    if (cv === "error" || ai === "error") return "Error memuat model";
    return "Menunggu Model...";
  };

  const modelStatusString = getModelStatusString();

  return (
    <div className="app-container">
      <Header modelStatus={modelStatusString} />

      {!isOnline && (
        <div
          style={{
            background: "#fef3c7",
            color: "#92400e",
            textAlign: "center",
            padding: "0.5rem 1rem",
            fontSize: "0.8125rem",
            borderBottom: "1px solid #fcd34d",
            fontWeight: 500,
          }}
        >
          ⚠️ Offline — Fitur deteksi tetap berjalan jika model sudah di-cache
        </div>
      )}

      <main className="main-content">
        <CameraSection
          isRunning={state.isRunning}
          services={state.services || { camera: null }}
          modelStatus={modelStatusString}
          error={state.error}
          currentTone={currentTone}
          toneOptions={TONE_OPTIONS}
          onToggleCamera={handleToggleCamera}
          onToneChange={handleToneChange}
        />

        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          copyStatus={state.copyStatus}
          onCopyFact={handleCopyFact}
        />
      </main>

      <footer className="footer">
        <p>Powered by TensorFlow.js &amp; Transformers.js</p>
      </footer>

      {state.error && (
        <div
          style={{
            position: "fixed",
            bottom: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "380px",
            padding: "1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "var(--radius-md)",
            color: "#991b1b",
            fontSize: "0.875rem",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
            zIndex: 1000,
            textAlign: "center",
          }}
        >
          <div>
            <strong>Error:</strong> {state.error}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#991b1b",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Muat Ulang
            </button>
            <button
              onClick={() => actions.setError(null)}
              style={{
                background: "transparent",
                border: "1px solid #991b1b",
                color: "#991b1b",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
