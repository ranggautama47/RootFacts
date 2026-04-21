export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = null;
    this.fps = 15; // default FPS
    this.lastFrameTime = 0;
  }

  setVideoElement(videoElement) {
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  /**
   * [Basic] Dapatkan daftar perangkat kamera yang tersedia
   */
  async loadCameras() {
    try {
      // Minta izin kamera terlebih dahulu agar label perangkat tersedia
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');

      this.config = videoDevices;
      return videoDevices;
    } catch (error) {
      console.error('[CameraService] Gagal memuat daftar kamera:', error);
      throw new Error(`Gagal mengakses kamera: ${error.message}`);
    }
  }

  /**
   * [Basic] Mulai kamera dengan perangkat yang dipilih
   * @param {string|null} selectedCameraId - ID perangkat kamera (opsional)
   */
  async startCamera(selectedCameraId = null) {
    try {
      // Hentikan stream sebelumnya jika ada
      if (this.stream) {
        this.stopCamera();
      }

      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: selectedCameraId ? undefined : 'environment',
          ...(selectedCameraId && { deviceId: { exact: selectedCameraId } }),
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.video) {
        this.video.srcObject = this.stream;
        await new Promise((resolve, reject) => {
          this.video.onloadedmetadata = () => {
            this.video.play().then(resolve).catch(reject);
          };
          this.video.onerror = reject;
        });
      }

      console.log('[CameraService] Kamera berhasil dimulai');
      return true;
    } catch (error) {
      console.error('[CameraService] Gagal memulai kamera:', error);
      throw new Error(`Gagal memulai kamera: ${error.message}`);
    }
  }

  /**
   * [Basic] Hentikan kamera dan bersihkan sumber daya
   */
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop();
        console.log(`[CameraService] Track dihentikan: ${track.kind}`);
      });
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
    }

    this.lastFrameTime = 0;
    console.log('[CameraService] Kamera dihentikan');
  }

  /**
   * [Skilled] Atur batas FPS untuk deteksi
   * @param {number} fps - Frame per detik yang diinginkan
   */
  setFPS(fps) {
    if (fps > 0 && fps <= 60) {
      this.fps = fps;
      console.log(`[CameraService] FPS diatur ke: ${fps}`);
    }
  }

  /**
   * Cek apakah sudah waktunya untuk memproses frame baru berdasarkan FPS limit
   * @returns {boolean}
   */
  shouldProcessFrame() {
    const now = performance.now();
    const interval = 1000 / this.fps;
    if (now - this.lastFrameTime >= interval) {
      this.lastFrameTime = now;
      return true;
    }
    return false;
  }

  /**
   * [Basic] Cek apakah kamera sedang aktif
   */
  isActive() {
    return this.stream !== null && this.stream.active;
  }

  /**
   * [Basic] Cek apakah elemen video siap digunakan
   */
  isReady() {
    return (
      this.video !== null &&
      this.video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
      this.video.videoWidth > 0 &&
      this.video.videoHeight > 0
    );
  }
}