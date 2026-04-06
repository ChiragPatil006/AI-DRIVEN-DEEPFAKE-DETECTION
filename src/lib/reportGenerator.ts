import { jsPDF } from 'jspdf';
import { ScanResult } from './detection';

export const generateDetailedVideoReport = (scan: ScanResult) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const isFake = scan.result === 'fake';
  const accentColor = isFake ? [220, 38, 38] : [34, 197, 94];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 10;

  // Function to add new page if needed
  const checkPageBreak = (minSpace: number = 50) => {
    if (yPos + minSpace > pageHeight - 10) {
      doc.addPage();
      yPos = 10;
      return true;
    }
    return false;
  };

  // ===== PAGE 1: HEADER & SUMMARY =====
  // Header background
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('DeepGuard Analysis Report', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('VIDEO DEEPFAKE DETECTION WITH FRAME-BY-FRAME ANALYSIS', pageWidth / 2, 30, { align: 'center' });
  doc.text(`Report ID: ${scan.id.toUpperCase().slice(0, 16)}`, pageWidth / 2, 38, { align: 'center' });

  yPos = 65;

  // Watermark
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(50);
  doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
  doc.text(isFake ? 'SUSPICIOUS' : 'AUTHENTIC', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45,
  });
  doc.setGState(new (doc as any).GState({ opacity: 1.0 }));

  // Reset text color
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. MEDIA ASSESSMENT SUMMARY', 15, yPos);
  yPos += 8;

  // Summary box
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('File Name:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(scan.fileName, 60, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Result:', 20, yPos);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(isFake ? 'SUSPICIOUS - LIKELY DEEPFAKE' : 'AUTHENTIC - VERIFIED GENUINE', 60, yPos);
  doc.setTextColor(40, 40, 40);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Confidence Level:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${scan.confidence}% (Fake: ${scan.fakeConfidence}% | Real: ${scan.realConfidence}%)`, 60, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Risk Level:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(scan.riskLevel || 'UNKNOWN', 60, yPos);

  yPos += 15;

  // Recommendation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. ANALYSIS RECOMMENDATION', 15, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const recommendationLines = doc.splitTextToSize(scan.explanation || 'No recommendation available', pageWidth - 30);
  doc.text(recommendationLines, 20, yPos);
  yPos += recommendationLines.length * 5 + 5;

  // Model Scores
  if (scan.modelScores && Object.keys(scan.modelScores).length > 0) {
    checkPageBreak(40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. DETECTION MODEL SCORES', 15, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    Object.entries(scan.modelScores).forEach(([model, score]) => {
      doc.text(`${model}:`, 20, yPos);
      doc.text(`${score}%`, 140, yPos);

      // Progress bar
      const barWidth = 50;
      const filledWidth = (score / 100) * barWidth;
      doc.setDrawColor(200, 200, 200);
      doc.rect(155, yPos - 2, barWidth, 4);
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(155, yPos - 2, filledWidth, 4, 'F');

      yPos += 6;
    });
  }

  // ===== PAGE 2+: FRAME-BY-FRAME ANALYSIS =====
  if (scan.frameAnalysis && scan.frameAnalysis.length > 0) {
    doc.addPage();
    yPos = 15;

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('4. FRAME-BY-FRAME ANALYSIS', 15, yPos);
    yPos += 12;

    doc.setFontSize(10);
    doc.text(
      `Total Frames Analyzed: ${scan.frameAnalysis.length} frames at various timestamps throughout the video`,
      15,
      yPos
    );
    yPos += 8;

    // Process frames - show every few frames to fit on pages
    const framesToShow = Math.min(scan.frameAnalysis.length, 12); // Max 12 frames per report
    const frameStep = Math.floor(scan.frameAnalysis.length / framesToShow) || 1;

    scan.frameAnalysis.forEach((frame, index) => {
      if (index % frameStep !== 0 && index !== scan.frameAnalysis.length - 1) return;

      checkPageBreak(80);

      // Frame number and timestamp
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(`Frame ${index + 1} @ ${frame.frameTime.toFixed(2)}s`, 15, yPos);

      yPos += 7;

      // Frame image
      if (frame.frameImageData) {
        try {
          doc.addImage(frame.frameImageData, 'JPEG', 15, yPos, 60, 45);
          yPos += 50;
        } catch (e) {
          // Image failed to load
          yPos += 5;
        }
      }

      // Confidence and risk level
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);

      doc.text(`Fake Confidence: ${frame.frameConfidence?.toFixed(1)}%`, 80, yPos - 45);
      doc.text(`Risk Level: ${frame.riskLevel || 'UNKNOWN'}`, 80, yPos - 39);

      // Confidence bar
      doc.setDrawColor(200, 200, 200);
      doc.rect(80, yPos - 33, 40, 3);
      const confidence = frame.frameConfidence || 0;
      const barColor = confidence > 60 ? [220, 38, 38] : confidence > 40 ? [245, 158, 11] : [16, 185, 129];
      doc.setFillColor(barColor[0], barColor[1], barColor[2]);
      doc.rect(80, yPos - 33, (confidence / 100) * 40, 3, 'F');

      yPos -= 25;

      // Explanation
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const explanationLines = doc.splitTextToSize(frame.frameExplanation || 'No explanation available', 110);
      doc.text(explanationLines, 80, yPos);
      yPos += explanationLines.length * 4 + 10;
    });
  }

  // ===== FINAL PAGE: TECHNICAL DETAILS & FOOTER =====
  if (scan.detailedReport) {
    doc.addPage();
    yPos = 15;

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('5. DETAILED TECHNICAL REPORT', 15, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const reportLines = doc.splitTextToSize(scan.detailedReport, pageWidth - 30);
    doc.text(reportLines, 15, yPos);
  }

  // Footer on every page
  const totalPages = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    (doc as any).setPage(i);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);

    doc.text(`Generated on ${new Date().toLocaleString()}`, 15, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 7, { align: 'right' });
    doc.text('DeepGuard Neural Engine - Forensic Analysis System', pageWidth / 2, pageHeight - 7, { align: 'center' });
  }

  // Save PDF
  doc.save(`DeepGuard_Report_${scan.fileName.split('.')[0]}.pdf`);
};

export const generateReport = (scan: ScanResult) => {
  if (scan.fileType === 'video' && scan.frameAnalysis && scan.frameAnalysis.length > 0) {
    generateDetailedVideoReport(scan);
  } else {
    // Fallback to simple report for images
    const doc = new jsPDF();
    const isFake = scan.result === 'fake';
    const accentColor = isFake ? [220, 38, 38] : [34, 197, 94];

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, 210, 50, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('DeepGuard Report', 105, 25, { align: 'center' });

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(isFake ? 'DEEPFAKE DETECTED' : 'VERIFIED AUTHENTIC', 105, 100, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Confidence: ${scan.confidence}%`, 105, 120, { align: 'center' });
    doc.text(scan.explanation, 20, 150, { maxWidth: 170 });

    doc.save(`Report_${scan.fileName.split('.')[0]}.pdf`);
  }
};
