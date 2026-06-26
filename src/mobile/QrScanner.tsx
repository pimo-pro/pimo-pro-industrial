import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { centralFetch } from '@/services/centralApiClient';

type ScanMode = 'camera' | 'manual';

export function QrScanner({ onScan }: { onScan: (qr: string) => void }) {
  const [mode, setMode] = useState<ScanMode>('manual');
  const [manualQr, setManualQr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const detector = 'BarcodeDetector' in window
        ? new (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => { detect: (s: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({ formats: ['qr_code'] })
        : null;

      if (!detector) {
        setError('Câmera ativa — use entrada manual se o dispositivo não suportar leitura automática.');
        return;
      }

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            onScan(codes[0].rawValue.trim().toLowerCase());
            stopCamera();
            return;
          }
        } catch {
          /* frame skip */
        }
        loopRef.current = requestAnimationFrame(() => void tick());
      };
      loopRef.current = requestAnimationFrame(() => void tick());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível aceder à câmera');
      setMode('manual');
    }
  }, [onScan, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function submitManual() {
    const qr = manualQr.trim().toLowerCase();
    if (!qr) return;
    onScan(qr);
  }

  return (
    <div className="mobile-scanner">
      <div className="mobile-scanner-tabs">
        <button type="button" className={mode === 'camera' ? 'active' : ''} onClick={() => void startCamera()}>
          Câmera
        </button>
        <button
          type="button"
          className={mode === 'manual' ? 'active' : ''}
          onClick={() => {
            stopCamera();
            setMode('manual');
          }}
        >
          Manual
        </button>
      </div>

      {mode === 'camera' && (
        <div className="mobile-camera-wrap">
          <video ref={videoRef} playsInline muted className="mobile-camera" />
          {scanning && <p className="hint">Aponte para o QR da peça…</p>}
        </div>
      )}

      {mode === 'manual' && (
        <div className="mobile-manual">
          <input
            value={manualQr}
            onChange={(e) => setManualQr(e.target.value)}
            placeholder="Código QR"
            onKeyDown={(e) => e.key === 'Enter' && void submitManual()}
          />
          <button type="button" onClick={() => void submitManual()}>
            Ler QR
          </button>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export function useQrNavigation() {
  const navigate = useNavigate();

  return useCallback(
    async (qr: string) => {
      const lookup = await centralFetch<{
        user: string;
        project: string;
        box: string;
        pieceName: string;
      }>(`/lookup/${encodeURIComponent(qr)}`);
      navigate(
        `/PROJETOS/${encodeURIComponent(lookup.user)}/${encodeURIComponent(lookup.project)}/${encodeURIComponent(lookup.box)}/${encodeURIComponent(lookup.pieceName)}`
      );
    },
    [navigate]
  );
}
