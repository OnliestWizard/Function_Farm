// Image Cropper Component
// Self-contained React cropper built on react-easy-crop (MIT, (c) Valentin Hervieu).
// API confirmed against ValentinH/react-easy-crop README.md.
//
//   npm install react-easy-crop
//
// <ImageCropper image={dataUrl} onCropped={(url) => ...} />

import * as React from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';

export type ImageCropperProps = {
  /** Image to crop, as a data URL (ImageDataURL) or remote URL. */
  image: string;
  /** Aspect ratio (width / height). Defaults to 4 / 3. */
  aspect?: number;
  /** Crop shape. Defaults to 'rect'. */
  cropShape?: 'rect' | 'round';
  /** Output mime type for the cropped image. Defaults to 'image/jpeg'. */
  outputType?: string;
  /** Required: receives the cropped image as a data URL (ImageDataURL). */
  onCropped: (croppedDataUrl: string) => void;
};

/**
 * Crops `imageSrc` to `pixelCrop` ({ x, y, width, height }) on a canvas and
 * returns a data URL. Pure helper — no external deps.
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputType = 'image/jpeg'
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.setAttribute('crossOrigin', 'anonymous'); // avoid tainted-canvas for remote URLs
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL(outputType);
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  image,
  aspect = 4 / 3,
  cropShape = 'rect',
  outputType = 'image/jpeg',
  onCropped,
}) => {
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState<number>(1);
  const [busy, setBusy] = React.useState<boolean>(false);
  const croppedAreaPixelsRef = React.useRef<Area | null>(null);

  const onCropComplete = React.useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      croppedAreaPixelsRef.current = croppedAreaPixels;
    },
    []
  );

  const handleCrop = React.useCallback(async () => {
    const pixels = croppedAreaPixelsRef.current;
    if (!pixels) return;
    setBusy(true);
    try {
      const croppedDataUrl = await getCroppedImg(image, pixels, outputType);
      onCropped(croppedDataUrl);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to crop image:', err);
    } finally {
      setBusy(false);
    }
  }, [image, outputType, onCropped]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* react-easy-crop is position:absolute and fills this relative parent. */}
      <div style={{ position: 'relative', width: '100%', height: 360, background: '#333' }}>
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={cropShape}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
        />
        <button type="button" onClick={handleCrop} disabled={busy}>
          {busy ? 'Cropping…' : 'Crop'}
        </button>
      </div>
    </div>
  );
};

export default ImageCropper;
