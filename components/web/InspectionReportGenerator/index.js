import React, { useState, useRef } from 'react';
import { jsPDF } from "jspdf";

// Inspection Report Generator
function InspectionReportGenerator({ photoUrl, title, notes }) {
  const doc = new jsPDF();
  
  const generatePDF = () => {
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    doc.setFontSize(12);
    doc.text(notes, 20, 30);
    doc.addImage(photoUrl, "JPEG", 15, 40, 180, 160);
    doc.save(`${title.replace(/\s+/g, '_')}_Report.pdf`);
  };

  return (
    <div className="report-generator">
      <h1>{title}</h1>
      <img src={photoUrl} alt="Captured" className="w-full h-auto object-cover" />
      <p>{notes}</p>
      <button onClick={generatePDF} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg">
        Export as PDF
      </button>
    </div>
  );
}

export default InspectionReportGenerator;
