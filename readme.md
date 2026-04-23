# 🌿 RootFacts — AI Vegetable Detection & Fun Facts

<div align="center">

<img src="public/icons/icon-512x512.png" alt="RootFacts Logo" width="120" />

### Scan vegetables with your camera. Get AI-powered fun facts instantly.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-root--facts.vercel.app-10b981?style=for-the-badge&logo=vercel)](https://root-facts.vercel.app)

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-FF6F00?style=flat&logo=tensorflow&logoColor=white)
![Transformers.js](https://img.shields.io/badge/Transformers.js-FFD21E?style=flat&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat&logo=pwa)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat&logo=vite&logoColor=white)
![Netlify](https://img.shields.io/badge/Deployed-Vercel-black?style=flat&logo=vercel)

</div>

---

## 📖 About

**RootFacts** is a Progressive Web App (PWA) that combines two on-device AI technologies:

- 🔍 **Computer Vision** — Real-time vegetable detection via camera using TensorFlow.js
- 💬 **Generative AI** — Unique fun facts generated for each detected vegetable using Transformers.js

All AI inference runs **100% in the browser** — no backend server, no data sent to the cloud. Works fully **offline** after the first load.

> Built as a submission for **Dicoding — Belajar Penerapan AI di Aplikasi Web**

---

## ✨ Features

### 🤖 Criteria 1 — Computer Vision (TensorFlow.js)
| Feature | Details |
|---------|---------|
| Detects 18 vegetables | Beetroot, Carrot, Cucumber, Garlic, Ginger, Spinach, and more |
| Adaptive Backend | Auto-selects WebGPU → WebGL → CPU |
| Configurable FPS Limit | UI slider from 15–60 FPS to balance performance |
| Real-time Loading Indicator | Progress bar 0–100% during model initialization |
| Memory Management | `tf.tidy()` on every prediction cycle |

### 💡 Criteria 2 — Generative AI (Transformers.js)
| Feature | Details |
|---------|---------|
| Dynamic Fun Facts | Unique fact generated per detected vegetable |
| 5 Dynamic Personas | Normal · Funny · Professional · Historical · Kids |
| Tuned Parameters | `temperature`, `top_p`, `max_new_tokens`, `do_sample` |
| Copy to Clipboard | One-click copy with toast notification |
| Share | Native Share API (mobile) / WhatsApp & Telegram (desktop) |
| Adaptive Backend | WebGPU → WASM (self-hosted, offline-safe) |

### 📱 Criteria 3 — PWA & Offline Capability
| Feature | Details |
|---------|---------|
| Web App Manifest | Complete with 10 icon sizes + 2 screenshots |
| Service Worker | Workbox `generateSW` with precaching |
| Offline TF Model | `model.json` + `weights.bin` precached via Workbox |
| Self-hosted WASM | ONNX `.wasm` files served from `/public/wasm/` |
| Installable | Install button appears in browser address bar |
| Offline Banner | Auto-shown when connection is lost |
| Deployed | ✅ Live on Vercel |

---

## 🚀 Live Demo

🔗 **[root-facts.vercel.app](https://root-facts.vercel.app)**

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.x | UI Framework |
| Vite | 6.x | Build tool & dev server |
| TensorFlow.js | 4.x | On-device Computer Vision |
| @xenova/transformers | 2.x | On-device Generative AI |
| vite-plugin-pwa | 1.x | PWA & Service Worker generation |
| Workbox | 7.x | Caching strategies |
| SweetAlert2 | 11.x | Loading modals & toast notifications |
| Lucide React | 0.5x | UI icons |

---

## 📂 Project Structure

```
RootFacts/
├── public/
│   ├── icons/                      # PWA icons (72px to 512px + apple-touch-icon)
│   ├── model/                      # TensorFlow.js model files (model.json + weights.bin)
│   ├── screenshots/                # PWA screenshots (wide + narrow)
│   ├── wasm/                       # Self-hosted WASM files (ort-wasm.wasm etc.)
│   ├── favicon.ico
│   └── manifest.json               # Web App Manifest
├── src/
│   ├── components/
│   │   ├── CameraSection.jsx       # Camera feed + FPS slider + persona dropdown
│   │   ├── Header.jsx              # App header + model status indicator
│   │   └── InfoPanel.jsx           # Detection result + fun fact card
│   ├── hooks/
│   │   ├── useAppState.js          # Global state management (useReducer)
│   │   └── useOnlineStatus.js      # Online/offline connection detector
│   ├── services/
│   │   ├── CameraService.js        # MediaStream API + FPS limiter
│   │   ├── DetectionService.js     # TensorFlow.js inference + adaptive backend
│   │   └── RootFactsService.js     # Transformers.js inference + persona system
│   ├── utils/
│   │   ├── common.js               # Shared utility functions
│   │   ├── config.js               # App configuration constants
│   │   └── ui.js                   # UI helper utilities
│   ├── App.jsx                     # Main orchestrator component
│   ├── index.css                   # Global styles
│   ├── main.jsx                    # React entry point
│   └── sw.js                       # Service Worker (Workbox template)
├── copy-wasm.js                    # Script: copies WASM files to public/wasm/
├── vite.config.js                  # Vite + PWA plugin configuration
├── eslint.config.mjs               # ESLint configuration
├── index.html                      # HTML entry point
├── package.json
└── STUDENT.txt                     # Deployment URL (Dicoding requirement)
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js v18+
- npm v9+

### 1. Clone the repository

```bash
git clone https://github.com/ranggautama47/RootFacts.git
cd RootFacts
```

### 2. Install dependencies

```bash
npm install
```

### 3. Copy WASM files for offline support

```bash
node copy-wasm.js
```

> This copies `.wasm` files from `node_modules/@xenova/transformers/dist/` to `public/wasm/`
> so Transformers.js never needs to fetch from a CDN when offline.

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

> ⚠️ **Note:** The Service Worker is disabled in dev mode. To test PWA and offline features, use the production preview below.

### 5. Build & preview production (required for PWA testing)

```bash
npm run build
npm run preview
```

Open [http://localhost:4173](http://localhost:4173)

### 6. Lint

```bash
npm run lint
```

---

## 🧪 Testing the PWA

### Verify Manifest & Install
1. Open `http://localhost:4173` in Chrome or Edge
2. DevTools → **Application** → **Manifest**
3. Confirm: app name, icons, theme color, and start URL are all shown ✅
4. Look for the **Install** button in the address bar → click → confirm

### Test Offline Mode
1. Open the app online and wait for both models to finish loading
2. DevTools → **Network** → check **Offline**
3. Refresh the page — app still opens ✅
4. Vegetable detection still works (model served from cache) ✅

### Verify Cache Storage
DevTools → **Application** → **Cache Storage** should show:
- `workbox-precache-v2` — HTML, CSS, JS, icons
- `tensorflow-model-v1` — TF.js model files
- `hf-model-cache-v1` — Transformers.js model files

---

## 📝 Notes

- **First online load required** — The AI model (~80MB) is downloaded from HuggingFace and cached in the browser on first use
- **After caching** — The app runs fully offline including vegetable detection and fun fact generation
- **COOP/COEP headers** — Required for WebGPU and SharedArrayBuffer; already configured in `vite.config.js` and `netlify.toml`

---

## 👤 Author

**Rangga Utama**
- GitHub: [@ranggautama47](https://github.com/ranggautama47)
- Project: [root-facts.vercel.app](https://root-facts.vercel.app)

---

## 📄 License

This project was built for the **Dicoding — Belajar Penerapan AI di Aplikasi Web** course submission.