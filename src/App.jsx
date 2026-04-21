import { useRef, useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import CameraSection from "./components/CameraSection";
import InfoPanel from "./components/InfoPanel";
import useOnlineStatus from "./hooks/useOnlineStatus";
import { useAppState } from "./hooks/useAppState";
import { CameraService } from "./services/CameraService";
import { DetectionService } from "./services/DetectionService";
import { RootFactsService, TONE_CONFIG } from "./services/RootFactsService";

const MODEL_URL = "/model/model.json";
const METADATA_URL = "/model/metadata.json";
const CONFIDENCE_THRESHOLD = 70;
const FACT_COOLDOWN_MS = 8000;

// Buat toneOptions sebagai array agar kompatibel dengan CameraSection
const TONE_OPTIONS = Object.entries(TONE_CONFIG.tones).map(
  ([value, config]) => ({
    value,
    label: config.label,
  }),
);

function App() {
  const { state, actions } = useAppState();
  const isOnline = useOnlineStatus();
  const detectionCleanupRef = useRef(null);
  const isRunningRef = useRef(false);
  const lastFactTimeRef = useRef(0);
  const lastLabelRef = useRef("");
  const animFrameRef = useRef(null);

  const [currentTone, setCurrentTone] = useState(TONE_CONFIG.defaultTone);

  const cameraServiceRef = useRef(new CameraService());
  const detectionServiceRef = useRef(new DetectionService());
  const factsServiceRef = useRef(new RootFactsService());

  // Internal cleanup — didefinisikan lebih awal agar bisa dipakai di useEffect
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

  // [Basic] Inisialisasi semua layanan saat aplikasi dimuat
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

        // Muat model CV (TensorFlow.js) dengan progress
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
          },
        );
        actions.setModelStatus((prev) => ({
          ...prev,
          cv: "ready",
          cvProgress: 100,
        }));

        // Muat model AI (Transformers.js) dengan progress
        await factsServiceRef.current.loadModel((percent, message) => {
          actions.setModelStatus((prev) => ({
            ...prev,
            ai: percent < 100 ? "loading" : "ready",
            aiProgress: percent,
            aiMessage: message,
          }));
        });
        actions.setModelStatus((prev) => ({
          ...prev,
          ai: "ready",
          aiProgress: 100,
        }));

        actions.setAppState("ready");
        console.log("[App] Semua model berhasil dimuat!");
      } catch (error) {
        console.error("[App] Error inisialisasi:", error);
        actions.setError(`Gagal memuat model: ${error.message}`);
        actions.setAppState("error");
      }
    };

    initServices();

    return () => {
      cleanup();
    };
  }, []); // Jalankan hanya sekali saat mount

  // [Basic] Loop deteksi utama menggunakan requestAnimationFrame
  const startDetectionLoop = useCallback(
    (videoElement) => {
      const camera = cameraServiceRef.current;
      const detection = detectionServiceRef.current;
      const facts = factsServiceRef.current;

      camera.setFPS(15);

      const loop = async () => {
        if (!isRunningRef.current) return;

        if (
          camera.shouldProcessFrame() &&
          camera.isReady() &&
          detection.isLoaded()
        ) {
          try {
            const result = await detection.predict(videoElement);

            if (result) {
              actions.setDetectionResult(result);
              actions.setAppState("result");

              const now = Date.now();
              const isNewLabel = result.label !== lastLabelRef.current;
              const isCooldownDone =
                now - lastFactTimeRef.current > FACT_COOLDOWN_MS;
              const isConfident = result.confidence >= CONFIDENCE_THRESHOLD;

              if (
                isConfident &&
                facts.isReady() &&
                (isNewLabel || isCooldownDone)
              ) {
                lastLabelRef.current = result.label;
                lastFactTimeRef.current = now;

                actions.setFunFactData({ text: null, isLoading: true });
                try {
                  const factText = await facts.generateFacts(result.label);
                  actions.setFunFactData({ text: factText, isLoading: false });
                } catch (e) {
                  actions.setFunFactData({
                    text: null,
                    isLoading: false,
                    error: e.message,
                  });
                }
              }
            }
          } catch (err) {
            console.error("[App] Error dalam loop deteksi:", err);
          }
        }

        animFrameRef.current = requestAnimationFrame(loop);
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

  // [Basic] Toggle kamera
  const handleToggleCamera = useCallback(
    async (videoElement) => {
      const camera = cameraServiceRef.current;

      if (state.isRunning) {
        isRunningRef.current = false;
        if (detectionCleanupRef.current) {
          detectionCleanupRef.current();
        }
        camera.stopCamera();
        actions.setIsRunning(false);
        actions.setAppState("idle");
        actions.setDetectionResult(null);
        actions.setFunFactData(null);
        lastLabelRef.current = "";
      } else {
        try {
          actions.setAppState("analyzing");
          await camera.loadCameras();
          await camera.startCamera();
          isRunningRef.current = true;
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

  // [Advanced] Ubah tone/persona AI
  const handleToneChange = useCallback(
    (newTone) => {
      setCurrentTone(newTone);
      factsServiceRef.current.setTone(newTone);
      lastFactTimeRef.current = 0;
      actions.setFunFactData(null);
    },
    [actions],
  );

  // [Skilled] Salin fakta ke clipboard
  const handleCopyFact = useCallback(async () => {
    const text = state.funFactData?.text;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      actions.setCopyStatus("copied");
      setTimeout(() => actions.setCopyStatus("idle"), 2000);
    } catch (error) {
      console.error("[App] Gagal menyalin:", error);
      actions.setCopyStatus("error");
      setTimeout(() => actions.setCopyStatus("idle"), 2000);
    }
  }, [state.funFactData, actions]);

  // Buat string status yang mudah dibaca untuk Header dan CameraSection
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
      <div className="offline-banner">
        ⚠️ Anda sedang offline / koneksi terputus
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
            flexDirection: "column", // Ubah ke kolom agar tombol rapi
            alignItems: "center",
            gap: "0.75rem",
            zIndex: 1000,
            textAlign: "center",
          }}
        >
          <div>
            <strong>Error Fatal:</strong> {state.error}
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
              Muat Ulang Aplikasi
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
              Tutup Pesan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
