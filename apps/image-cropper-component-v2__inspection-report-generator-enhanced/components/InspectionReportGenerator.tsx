import jsPDF from 'jspdf';
import { useState } from 'react';

function InspectionReportGenerator({ photoUrl, title, notes }) {
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(title, 20, 30);
    if(photoUrl) {
      doc.addImage(photoUrl, 'JPEG', 15, 40, 180, 160);
    }
    doc.setFontSize(16);
    doc.text(notes, 20, 220);
    doc.save('inspection-report.pdf');
  };

  return (
    <div>
      <button onClick={generatePDF} className="report-button">
        Generate Report
      </button>
    </div>
  );
}

export default InspectionReportGenerator;