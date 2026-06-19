'use client';

import { useRef, useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';

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
    return stopCamera;
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
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
      <div className="fixed inset-0 bg-black flex items-center justify-center p-6">
        <X size={64} className="text-red-500 mb-6" />
        <h2 className="text-white text-xl font-bold mb-2">{error}</h2>
        {allowSkip && (
          <button onClick={onSkip} className="mt-6 px-8 py-4 bg-zinc-800 text-white font-bold rounded-xl">
            Skip Photo
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      {!ready && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="absolute top-16 left-0 right-0 text-center">
        <p className="text-sm font-bold text-white bg-black/50 py-2 uppercase tracking-widest">{title}</p>
      </div>
      {allowSkip && (
        <button onClick={onSkip} className="absolute top-16 right-4 w-10 h-10 bg-black/50 flex items-center justify-center rounded-full">
          <X size={20} className="text-white" />
        )}
      }
      <div className="absolute bottom-8 flex justify-center left-0 right-0">
        <button onClick={capturePhoto} disabled={!ready} className="w-20 h-20 bg-white border-4 border-zinc-300 flex justify-center items-center rounded-full shadow-2xl">
          <Camera size={32} className="text-zinc-800" />
        </button>
      </div>
    </div>
  );
}

test line here, if i backed a cookie and ate it