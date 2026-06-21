import * as React from 'react';
import { Area, Point, Size } from './types';
import {
  computeCroppedArea,
  getInitialCropFromCroppedAreaPixels,
} from './helpers';
import styles from './styles.css?raw';

type CropperProps = {
  image: string; // data URL
  crop: Point;
  zoom: number;
  rotation: number;
  aspect: number;
  onCropChange: (location: Point) => void;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  restrictPosition: boolean;
};

const Cropper: React.FC<CropperProps> = ({
  image,
  crop,
  zoom,
  rotation,
  aspect,
  onCropChange,
  onCropComplete,
  restrictPosition = true,
}) => {
  const imageRef = React.useRef<HTMLImageElement | null>(null);

  const onImageLoad = () => {
    const mediaSize = {
      width: imageRef.current?.naturalWidth || 0,
      height: imageRef.current?.naturalHeight || 0,
    };
    const cropSize = getInitialCropFromCroppedAreaPixels(
      mediaSize,
      rotation,
      aspect,
      minZoom,
      maxZoom
    );
    onCropChange(cropSize.crop);
  };

  const handleCropAreaChange = () => {
    const croppedArea = computeCroppedArea(imageRef.current, crop, aspect);
    onCropComplete(croppedArea.area, croppedArea.pixelsArea);
  };

  return (
    <div className="cropper-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <img
        ref={imageRef}
        src={image}
        alt="crop"
        onLoad={onImageLoad}
        style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
      />
      <div className="crop-area" style={calcCropAreaStyles(crop)}></div>
    </div>
  );
};

const calcCropAreaStyles = (crop: Point) => ({
  position: 'absolute',
  top: `${crop.y}px`,
  left: `${crop.x}px`,
  border: '1px dashed #333',
  boxSizing: 'border-box',
});

export default Cropper;