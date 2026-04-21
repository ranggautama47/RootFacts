import { useState, useRef, useEffect } from "react";
import { Camera, Mic, ScanLine } from "lucide-react";

function CameraSection({
  isRunning,
  onToggleCamera,
  onToneChange,
  toneOptions,
  services,
  modelStatus,
  error,
  currentTone,
}) {
  const [fps, setFps] = useState(15);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Inisialisasi elemen video/canvas ke service
  useEffect(() => {
    if (services && services.camera) {
      if (videoRef.current) {
        services.camera.setVideoElement(videoRef.current);
      }
      if (canvasRef.current) {
        services.camera.setCanvasElement(canvasRef.current);
      }
    }
  }, [services]);

  // Sinkronkan FPS ke service setiap kali berubah
  useEffect(() => {
    if (services && services.camera) {
      services.camera.setFPS(fps);
    }
  }, [fps, services]);

  const isModelReady = modelStatus === "Model AI Siap";
  const buttonDisabled = !isModelReady;
  const buttonText = isRunning ? "Stop Scan" : "Mulai Scan";

  return (
    <section className="camera-section" aria-label="Camera Feed and Controls">
      <div className="camera-container">
        <div className="camera-wrapper">
          <video
            ref={videoRef}
            id="media-video"
            autoPlay
            muted
            playsInline
            className={isRunning ? "" : "hidden"}
          />

          <canvas ref={canvasRef} id="media-canvas" className="hidden" />

          <div className={`camera-overlay ${isRunning ? "active" : ""}`}>
            <div className="overlay-frame"></div>
          </div>

          {!isRunning && (
            <div className="camera-placeholder">
              <Camera size={48} />
              <p>{isModelReady ? "Siap Memindai" : modelStatus}</p>
              {error && (
                <p
                  style={{
                    color: "#ef4444",
                    fontSize: "0.8125rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="camera-controls">
          <button
            id="btn-toggle"
            className={`capture-btn ${isRunning ? "scanning" : ""}`}
            onClick={() => onToggleCamera(videoRef.current)}
            disabled={buttonDisabled}
            aria-label={buttonText}
            style={{ opacity: buttonDisabled ? 0.6 : 1 }}
          >
            <ScanLine size={24} />
          </button>
        </div>

        <div className="settings-bar">
          <div className="setting-item fps-setting">
            <span id="fps-label">{fps} FPS</span>
            <input
              id="fps-slider"
              type="range"
              min="15"
              max="60"
              step="15"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              disabled={isRunning}
            />
          </div>

          <div className="setting-item tone-setting">
            <Mic size={16} />
            <select
              id="tone-select"
              value={currentTone || "normal"}
              onChange={(e) => onToneChange(e.target.value)}
              disabled={isRunning}
            >
              {toneOptions &&
                toneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CameraSection;
