import React from 'react';
import UltimateCameraCapture from './UltimateCameraCapture';
import InspectionReportGenerator from './InspectionReportGenerator';

function CameraPhotoReportGenerator() {
  const handleCapture = (photoDataUrl) => {
    const title = "Camera Photo Report";
    const notes = "This report includes the photo captured using the camera.";
    // Generate PDF report with the captured photo
    return <InspectionReportGenerator photoUrl={photoDataUrl} title={title} notes={notes} />;
  };

  return (
    <div>
      <h1>Camera Photo Report Generator</h1>
      <UltimateCameraCapture onCapture={handleCapture} />
    </div>
  );
}

export default CameraPhotoReportGenerator;