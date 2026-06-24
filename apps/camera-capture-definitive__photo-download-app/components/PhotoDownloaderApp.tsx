'use client';

import { useState, useCallback } from 'react';
// Pair with the camera half already in your warehouse:
// import DefinitiveCameraCapture from '../cameraCapture/DefinitiveCameraCapture';

/**
 * downloadDataUrl — save a base64 data URL (ImageDataURL) to the user's device.
 * Pure utility, no React. Returns the filename it saved as.
 *
 * @param {string} dataUrl - e.g. "data:image/jpeg;base64,..." (an ImageDataURL)
 * @param {string} [filename='photo'] - base name; extension auto-added from MIME.
 * @returns {string} the final filename written.
 */
export function downloadDataUrl(dataUrl, filename = 'photo') {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    throw new Error('downloadDataUrl: expected a data: URL (ImageDataURL)');
  }

  // Parse "data:[<mime>][;base64],<payload>"
  const [meta, payload] = dataUrl.split(',');
  const mime = (meta.match(/data:([^;]+)/) || [, 'application/octet-stream'])[1];
  const isBase64 = /;base64/i.test(meta);

  // Build a Blob (more reliable than huge href strings on some browsers).
  let blob;
  if (isBase64) {
    const bytes = atob(payload);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    blob = new Blob([arr], { type: mime });
  } else {
    blob = new Blob([decodeURIComponent(payload)], { type: mime });
  }

  // Sanitize name and ensure a sensible extension.
  const ext = (mime.split('/')[1] || 'bin').replace('jpeg', 'jpg');
  const base = String(filename).replace(/[^a-z0-9_-]+/gi, '_').replace(/_+/g, '_') || 'photo';
  const finalName = new RegExp(`\\.${ext}$`, 'i').test(base) ? base : `${base}.${ext}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Cleanup so the object URL doesn't leak.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return finalName;
}

/**
 * PhotoDownloader — shows a captured photo and a Save button.
 * Its `photo` input carries an ImageDataURL, so it mates directly with any
 * producer of that canonical type (e.g. the camera's onCapture).
 *
 * @param {string} photo - ImageDataURL to preview/download.
 * @param {string} [filename='photo'] - base filename for the download.
 * @param {(name: string) => void} [onDownload] - called with the saved filename.
 * @param {() => void} [onRetake] - optional: clear/retake.
 */
export function PhotoDownloader({ photo, filename = 'photo', onDownload, onRetake }) {
  const [error, setError] = useState(null);

  const handleSave = useCallback(() => {
    try {
      const name = downloadDataUrl(photo, filename);
      onDownload?.(name); // emits the saved filename
    } catch (e) {
      setError(e.message);
    }
  }, [photo, filename, onDownload]);

  if (!photo) return null;

  const wrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 16 };
  const img = { maxWidth: '100%', maxHeight: '60vh', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' };
  const row = { display: 'flex', gap: 12 };
  const btn = { padding: '14px 28px', borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer' };

  return (
    <div style={wrap}>
      <img src={photo} alt="Captured" style={img} />
      {error && <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>}
      <div style={row}>
        {onRetake && (
          <button onClick={onRetake} style={{ ...btn, background: '#27272a', color: '#fff' }}>Retake</button>
        )}
        <button onClick={handleSave} style={{ ...btn, background: '#2563eb', color: '#fff' }}>Save to device</button>
      </div>
    </div>
  );
}

/**
 * PhotoDownloaderApp — the whole small utility: capture a photo, then save it.
 * Drop <DefinitiveCameraCapture> (from the camera-capture-definitive asset) in
 * where indicated; it emits an ImageDataURL we feed straight to PhotoDownloader.
 */
export default function PhotoDownloaderApp({ filename = 'photo' }) {
  const [photo, setPhoto] = useState(null);

  if (!photo) {
    // Uncomment once DefinitiveCameraCapture is imported:
    // return <DefinitiveCameraCapture onCapture={setPhoto} onSkip={() => {}} />;
    return (
      <label style={{ display: 'inline-block', padding: 16, cursor: 'pointer' }}>
        Choose / capture a photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setPhoto(reader.result); // ImageDataURL
            reader.readAsDataURL(file);
          }}
        />
      </label>
    );
  }

  return (
    <PhotoDownloader
      photo={photo}
      filename={filename}
      onRetake={() => setPhoto(null)}
      onDownload={(name) => console.log('Saved', name)}
    />
  );
}
