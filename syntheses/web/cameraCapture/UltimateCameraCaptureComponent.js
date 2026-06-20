'use client';

import { useRef, useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';

/**
 * Ultimate Camera Capture Component
 *
 * @param {function} onCapture - Called with photo data URL when photo is taken
 * @param {function} onSkip - Called if camera fails or user skips (optional)
 * @param {string} title - Header title (optional)
 * @param {boolean} allowSkip - Show skip button (default: true)
 * @param {string} facingMode - 'environment' (back) or 'user' (front) (default: 'environment')
 */
export default function CameraCapture({
  onCapture,
  onSkip,
  title = "Take Photo",
  allowSkip = true,
  facingMode = 'environment'
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera not available");
      onSkip?.();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !ready) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    stopCamera();
    onCapture?.(dataUrl);
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-40 flex flex-col items-center justify-center p-6">
        <X size={64} className="text-red-500 mb-6" />
        <h2 className="text-xl font-bold text-white mb-2">{error}</h2>
        {allowSkip && (
          <button
            onClick={handleSkip}
            className="mt-6 px-8 py-4 rounded-xl bg-zinc-800 text-white font-bold"
          >
            Skip Photo
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-40 flex flex-col">
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Loading overlay */}
        {!ready && (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Header */}
        <div className="absolute top-16 left-0 right-0 text-center">
          <p className="text-white text-sm font-bold uppercase tracking-widest bg-black/50 py-2">
            {title}
          </p>
        </div>

        {/* Skip button */}
        {allowSkip && (
          <button
            onClick={handleSkip}
            className="absolute top-16 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
          >
            <X size={20} className="text-white" />
          </button>
        )}

        {/* Capture button */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button
            onClick={capturePhoto}
            disabled={!ready}
            className="w-20 h-20 rounded-full bg-white border-4 border-zinc-300 flex items-center justify-center active:scale-95 shadow-2xl disabled:opacity-50"
          >
            <Camera size={32} className="text-zinc-800" />
          </button>
        </div>
      </div>
    </div>
  );
}
