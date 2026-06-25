// Self-Contained React Image Cropper
// Harvested from ValentinH/react-easy-crop (MIT License, Copyright (c) 2022 Valentin Hervieu)
//   - docs/src/components/CropperExample.tsx (Cropper wiring, onCropComplete -> croppedAreaPixels)
//   - docs/src/components/cropImage.ts        (getCroppedImg canvas logic, rotation helpers inlined)
// Rotation helpers (getRadianAngle/rotateSize) are inlined here so this file has NO local imports.
// Deps: react, react-easy-crop

import React, { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'

// --- inlined from react-easy-crop src/helpers (avoids importing ../../../src/helpers) ---
function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180
}

// Returns the bounding-box of a rotated rectangle.
function rotateSize(width, height, rotation) {
  const rotRad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (err) => reject(err))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

/**
 * Crops `imageSrc` to `pixelCrop` (the croppedAreaPixels from react-easy-crop's onCropComplete)
 * and returns the result as an image/jpeg data URL via canvas.toDataURL.
 */
export async function getCroppedImg(imageSrc, pixelCrop, rotation = 0, flip = { horizontal: false, vertical: false }) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const rotRad = getRadianAngle(rotation)
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation)

  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')
  if (!croppedCtx) return null

  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // Emit an ImageDataURL (image/jpeg) rather than an object URL.
  return croppedCanvas.toDataURL('image/jpeg')
}

/**
 * ImageCropper
 * @param {string}   image     - source image as an ImageDataURL (data:image/...;base64,...) or any URL
 * @param {number}   [aspect]  - crop aspect ratio (default 4/3)
 * @param {string}   [cropShape] - 'rect' | 'round'
 * @param {boolean}  [showGrid]
 * @param {(croppedDataUrl: string) => void} onCropped - REQUIRED. Receives the cropped ImageDataURL.
 */
export default function ImageCropper({
  image,
  aspect = 4 / 3,
  cropShape = 'rect',
  showGrid = true,
  onCropped,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleCrop = useCallback(async () => {
    if (!image || !croppedAreaPixels) return
    setBusy(true)
    try {
      const croppedDataUrl = await getCroppedImg(image, croppedAreaPixels, rotation)
      if (croppedDataUrl && typeof onCropped === 'function') {
        onCropped(croppedDataUrl)
      }
    } finally {
      setBusy(false)
    }
  }, [image, croppedAreaPixels, rotation, onCropped])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative', width: '100%', height: 400, background: '#333' }}>
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          cropShape={cropShape}
          showGrid={showGrid}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Rotation
          <input
            type="range"
            min={0}
            max={360}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
          />
        </label>
        <button type="button" onClick={handleCrop} disabled={!image || !croppedAreaPixels || busy}>
          {busy ? 'Cropping…' : 'Crop'}
        </button>
      </div>
    </div>
  )
}
