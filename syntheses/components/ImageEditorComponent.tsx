import { AvatarEditorCore } from './AvatarEditor';
import { loadImageURL } from './utils/loadImageURL';

// Core Image Editor Component using AvatarEditorCore
export const ImageEditor = async (image: string): Promise<HTMLElement> => {
  const editor = new AvatarEditorCore({
    width: 250,
    height: 250,
    rotate: 0,
    border: 10,
    scale: 1.2,
  });

  const imgState = await editor.loadImage(image);

  const canvas = editor.getImageScaledToCanvas();
  document.body.appendChild(canvas); // Displaying Canvas for demonstration

  return canvas;
};

// Usage
const dataURL = "data:image/png;base64,..."; // Example Data URL
ImageEditor(dataURL).then(canvas => {
  console.log('Image Editor Ready:', canvas);
}).catch(console.error);