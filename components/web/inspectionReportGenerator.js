import React, { useState, useRef } from 'react';
import EnhancedCameraCapture from './EnhancedCameraCapture';
import { PDFDocument, rgb } from 'pdf-lib';

export default function InspectionReportGenerator() {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const downloadLinkRef = useRef();

  const handleCapture = (dataUrl) => {
    setPhoto(dataUrl);
  };

  const generatePDF = async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    page.drawText(title, { x: 50, y: 350, size: 20 });
    page.drawText(notes, { x: 50, y: 320, size: 12 });
    
    if (photo) {
      const jpgImage = await pdfDoc.embedJpg(photo);
      page.drawImage(jpgImage, {
        x: 50,
        y: 50,
        width: 200,
        height: 150,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    downloadLinkRef.current.href = url;
    downloadLinkRef.current.download = 'InspectionReport.pdf';
    downloadLinkRef.current.click();
  };

  return (
    <div className="report-generator">
      <h2>Create Inspection Report</h2>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <EnhancedCameraCapture onCapture={handleCapture}/>
      
      {photo && <img src={photo} alt="Captured" style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '10px' }} />}
      
      <button onClick={generatePDF}>Download PDF</button>
      <a ref={downloadLinkRef} style={{ display: 'none' }}>Download Link</a>
    </div>
  );
}