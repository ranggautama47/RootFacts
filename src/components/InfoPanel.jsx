import { Sparkles, Search, CheckCircle, Lightbulb, Copy, Share2 } from 'lucide-react';
import Swal from 'sweetalert2';

function InfoPanel({ appState, detectionResult, funFactData, error, copyStatus, onCopyFact }) {
    const isIdle = appState === 'idle' || appState === 'ready' || appState === 'initializing';
    const isAnalyzing = appState === 'analyzing';
    const isResult = appState === 'result';

    const renderIdleState = () => (
        <div id="state-idle" className="result-card idle-card">
            <div className="idle-icon"><Sparkles size={40} /></div>
            <h2>Scan Sayuran</h2>
            <p>Ketuk tombol di bawah untuk memulai dan temukan fakta menarik!</p>
            {error && (
                <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '1rem' }}>
                    {error}
                </p>
            )}
        </div>
    );

    const renderAnalyzingState = () => (
        <div id="state-loading" className="result-card loading-card">
            <div className="loading-animation">
                <div className="loading-ring"></div>
                <div className="loading-icon"><Search size={24} /></div>
            </div>
            <h2>Mencari...</h2>
            <p>Sedang mengidentifikasi sayuran Anda</p>
        </div>
    );

    const renderFunFactContent = () => {
        if (!funFactData || funFactData.isLoading) {
            return (
                <div id="fun-fact-loading" className="fun-fact-loading">
                    <div className="fun-fact-loading-spinner"></div>
                    <span>Memuat fakta menarik...</span>
                </div>
            );
        }
        if (funFactData.error) {
            return (
                <div style={{
                    padding: '0.75rem', background: '#fef3c7',
                    borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: '#92400e',
                }}>
                    Gagal menghasilkan fakta. Mode offline atau model belum siap.
                </div>
            );
        }
        return funFactData.text || '—';
    };

    const renderResultState = () => {
        if (!detectionResult) return null;

        const confidence = detectionResult.confidence || 0;

        /**
         * [FIX #2] Sinkronisasi label & fakta:
         * - Gunakan funFactData.label (label saat fakta di-generate) untuk judul fakta
         * - Ini mencegah mismatch saat loop deteksi sudah pindah ke label baru
         *   tapi fakta sebelumnya belum selesai di-render
         */
        const detectedLabel = detectionResult.label || detectionResult.className || '—';
        const factLabel = funFactData?.label || detectedLabel;

        const hasFact = funFactData && !funFactData.isLoading && funFactData.text;
        const copyLabel = copyStatus === 'copied' ? '✓ Tersalin!'
            : copyStatus === 'error' ? '✗ Gagal' : null;

        const handleShare = async () => {
            const text = funFactData?.text || '';
            const shareText = `🌿 Fakta tentang ${factLabel}:\n${text}\n\n— RootFacts App`;

            if (navigator.share) {
                try {
                    await navigator.share({ title: `Fakta ${factLabel}`, text: shareText });
                } catch {
                    // dibatalkan user, abaikan
                }
            } else {
                Swal.fire({
                    title: 'Bagikan ke',
                    html: `
                        <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0">
                            <a href="https://wa.me/?text=${encodeURIComponent(shareText)}"
                               target="_blank" rel="noopener"
                               style="color:#25D366;font-weight:600;text-decoration:none">
                               📱 WhatsApp
                            </a>
                            <a href="https://t.me/share/url?text=${encodeURIComponent(shareText)}"
                               target="_blank" rel="noopener"
                               style="color:#0088cc;font-weight:600;text-decoration:none">
                               ✈️ Telegram
                            </a>
                        </div>
                    `,
                    showConfirmButton: false,
                    showCloseButton: true,
                });
            }
        };

        return (
            <div id="state-result" className="result-card result-main">
                {/* Badge deteksi realtime */}
                <div className="detected-badge">
                    <CheckCircle size={14} />
                    <span id="detected-name">{detectedLabel}</span>
                </div>

                {/* Kartu Fun Fact — label dari fakta yang di-generate */}
                <div className="fun-fact-card">
                    <div className="fun-fact-icon"><Lightbulb size={28} /></div>
                    <div id="fun-fact-content">
                        {/* Sub-label: fakta tentang apa */}
                        {funFactData?.label && funFactData.label !== detectedLabel && (
                            <p style={{
                                fontSize: '0.75rem', color: '#6b7280',
                                margin: '0 0 4px', fontStyle: 'italic',
                            }}>
                                Fakta tentang: <strong>{factLabel}</strong>
                            </p>
                        )}
                        <div id="fun-fact-text" className="fun-fact-text">
                            {renderFunFactContent()}
                        </div>
                        {hasFact && (
                            <button
                                id="btn-copy"
                                className="copy-btn"
                                onClick={onCopyFact}
                                title="Salin fakta"
                                style={{ opacity: copyStatus !== 'idle' ? 0.7 : 1 }}
                            >
                                {copyLabel
                                    ? <span style={{ fontSize: '0.75rem' }}>{copyLabel}</span>
                                    : <Copy size={18} />
                                }
                            </button>
                        )}
                    </div>
                </div>

                {/* Confidence bar */}
                <div className="confidence-bar">
                    <span className="confidence-label">Kepercayaan</span>
                    <div className="confidence-track">
                        <div
                            id="confidence-fill"
                            className="confidence-fill"
                            style={{ width: `${confidence}%` }}
                        />
                    </div>
                    <span id="detected-confidence" className="confidence-value">
                        {confidence}%
                    </span>
                </div>

                {/* Share */}
                <div
                    className="share-hint"
                    onClick={handleShare}
                    style={{ cursor: 'pointer' }}
                >
                    <Share2 size={14} />
                    <span>Bagikan fakta ini!</span>
                </div>
            </div>
        );
    };

    return (
        <section className="results-section" aria-live="polite">
            {isIdle && renderIdleState()}
            {isAnalyzing && renderAnalyzingState()}
            {isResult && renderResultState()}
        </section>
    );
}

export default InfoPanel;