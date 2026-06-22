'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * DefinitiveCameraCapture — self-contained web React camera capture.
 *
 * Zero external dependencies (no lucide-react, no Tailwind). Drops into any
 * React web app. Emits the captured photo as an ImageDataURL (base64 data URL).
 *
 * @param {(dataUrl: string) => void} onCapture - Called with the photo data URL (ImageDataURL).
 * @param {() => void} [onSkip] - Called when the user skips or the camera fails.
 * @param {string} [title='Take Photo'] - Header label.
 * @param {boolean} [allowSkip=true] - Show the skip/close control.
 * @param {boolean} [allowFlip=true] - Show the front/back camera flip control.
 * @param {'environment'|'user'} [facingMode='environment'] - Initial camera.
 * @param {string} [imageType='image/jpeg'] - Output MIME type.
 * @param {number} [quality=0.8] - JPEG/WebP quality 0..1.
 */
export default function DefinitiveCameraCapture({
  onCapture,
  onSkip,
  title = 'Take Photo',
  allowSkip = true,
  allowFlip = true,
  facingMode = 'environment',
  imageType = 'image/jpeg',
  quality = 0.8,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState(facingMode);
  const [preview, setPreview] = useState(null); // pending ImageDataURL awaiting confirm

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (mode) => {
    stopCamera();
    setReady(false);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera not available');
      onSkip?.();
    }
  }, [stopCamera, onSkip]);

  useEffect(() => {
    startCamera(facing);
    return stopCamera;
  }, [facing, startCamera, stopCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL(imageType, quality);
    setPreview(dataUrl);
  };

  const confirmPhoto = () => {
    stopCamera();
    onCapture?.(preview); // emits ImageDataURL
    setPreview(null);
  };

  const retake = () => setPreview(null);
  const flip = () => setFacing((m) => (m === 'environment' ? 'user' : 'environment'));
  const handleSkip = () => { stopCamera(); onSkip?.(); };

  // --- inline styles (self-contained) ---
  const overlay = { position: 'fixed', inset: 0, background: '#000', zIndex: 40, display: 'flex', flexDirection: 'column' };
  const fill = { width: '100%', height: '100%', objectFit: 'cover' };
  const roundBtn = { width: 40, height: 40, borderRadius: '9999px', background: 'rgba(0,0,0,0.5)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
  const shutter = { width: 76, height: 76, borderRadius: '9999px', background: '#fff', border: '4px solid #d4d4d8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' };
  const pill = { color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', background: 'rgba(0,0,0,0.5)', padding: '8px 0', textAlign: 'center' };

  if (error) {
    return (
      <div style={{ ...overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <IconX size={64} color="#ef4444" />
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '16px 0 0' }}>{error}</h2>
        {allowSkip && (
          <button onClick={handleSkip} style={{ marginTop: 24, padding: '16px 32px', borderRadius: 12, background: '#27272a', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Skip Photo
          </button>
        )}
      </div>
    );
  }

  // Preview / retake screen
  if (preview) {
    return (
      <div style={overlay}>
        <img src={preview} alt="Captured" style={fill} />
        <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button onClick={retake} style={{ padding: '14px 28px', borderRadius: 12, background: '#27272a', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Retake</button>
          <button onClick={confirmPhoto} style={{ padding: '14px 28px', borderRadius: 12, background: '#fff', color: '#18181b', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Use Photo</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay}>
      <div style={{ flex: 1, position: 'relative' }}>
        <video ref={videoRef} autoPlay playsInline muted style={fill} />

        {!ready && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'dcc-spin 0.8s linear infinite' }} />
            <style>{'@keyframes dcc-spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        )}

        <div style={{ position: 'absolute', top: 64, left: 0, right: 0 }}>
          <p style={pill}>{title}</p>
        </div>

        {allowSkip && (
          <button onClick={handleSkip} style={{ ...roundBtn, position: 'absolute', top: 64, right: 16 }} aria-label="Skip">
            <IconX size={20} color="#fff" />
          </button>
        )}

        {allowFlip && (
          <button onClick={flip} style={{ ...roundBtn, position: 'absolute', top: 64, left: 16 }} aria-label="Flip camera">
            <IconFlip size={20} color="#fff" />
          </button>
        )}

        <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <button onClick={capturePhoto} disabled={!ready} style={{ ...shutter, opacity: ready ? 1 : 0.5 }} aria-label="Capture">
            <IconCamera size={32} color="#27272a" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- inline SVG icons (replace lucide-react) ---- */
function IconCamera({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
function IconX({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconFlip({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <polyline points="23 20 23 14 17 14" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}
