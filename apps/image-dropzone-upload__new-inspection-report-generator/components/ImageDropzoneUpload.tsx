import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

/**
 * ImageDropzoneUpload
 * ------------------------------------------------------------
 * Self-contained React (web) image-upload component.
 *
 * Built on react-dropzone (https://github.com/react-dropzone/react-dropzone),
 * MIT License, Copyright (c) 2018 Param Aggarwal.
 *
 * Accepts a dropped or file-dialog-selected image File, reads it via
 * FileReader.readAsDataURL, and emits a base64 `data:` URL through the
 * REQUIRED output callback `onUpload(dataUrl)` (canonical: ImageDataURL).
 *
 * Props:
 *   onUpload(dataUrl: string)  REQUIRED  - receives the base64 data: URL
 *   onError(err: Error)        optional  - FileReader read failure
 *   accept                     optional  - MIME map (default image/*)
 *   multiple                   optional  - allow multiple (emits per file)
 *   className / children       optional  - styling / custom label
 */
export default function ImageDropzoneUpload({
  onUpload,
  onError,
  accept = { 'image/*': [] },
  multiple = false,
  className = 'dropzone',
  children,
}) {
  if (typeof onUpload !== 'function') {
    throw new Error('ImageDropzoneUpload: `onUpload` callback is required.');
  }

  const readAsDataURL = useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onabort = () => reject(new Error('File reading was aborted'));
        reader.onerror = () => reject(reader.error || new Error('File reading failed'));
        reader.onload = () => resolve(reader.result); // base64 data: URL
        reader.readAsDataURL(file);
      }),
    []
  );

  const onDrop = useCallback(
    async (acceptedFiles) => {
      for (const file of acceptedFiles) {
        try {
          const dataUrl = await readAsDataURL(file);
          onUpload(dataUrl); // emits ImageDataURL
        } catch (err) {
          if (typeof onError === 'function') onError(err);
        }
      }
    },
    [onUpload, onError, readAsDataURL]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({ accept, multiple, onDrop });

  return (
    <section className="image-dropzone-upload">
      <div {...getRootProps({ className })}>
        <input {...getInputProps()} />
        {children || (
          <p>
            {isDragReject
              ? 'Only image files are accepted'
              : isDragActive
              ? 'Drop the image here \u2026'
              : "Drag 'n' drop an image here, or click to select"}
          </p>
        )}
      </div>
      {fileRejections.length > 0 && (
        <ul className="rejections">
          {fileRejections.map(({ file, errors }) => (
            <li key={file.path || file.name}>
              {file.path || file.name}
              <ul>
                {errors.map((e) => (
                  <li key={e.code}>{e.message}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
