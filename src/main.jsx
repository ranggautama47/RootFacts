import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

/**
 * CATATAN SERVICE WORKER:
 * Registrasi SW dikelola OTOMATIS oleh vite-plugin-pwa (injectRegister: 'auto').
 * JANGAN tambahkan registrasi manual di sini — akan konflik dan menyebabkan
 * SW "trying to install" terus menerus.
 *
 * SW hanya aktif di PRODUCTION build:
 *   npm run build && npm run preview
 *
 * Di dev mode (npm run dev), SW sengaja dinonaktifkan (devOptions.enabled: false).
 */