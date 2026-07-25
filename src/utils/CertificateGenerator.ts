/**
 * CertificateGenerator.ts
 * Offscreen canvas rendering engine that compiles a professional, high-resolution
 * verifiable technical credential and triggers a client-side download.
 */

interface CertificateData {
  studentName: string;
  courseTitle: string;
  certId: string;
  verificationHash: string;
  dateStr?: string;
}

export function generateCertificateImage(data: CertificateData): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const {
        studentName,
        courseTitle,
        certId,
        verificationHash,
        dateStr = new Date().toISOString().split('T')[0]
      } = data;

      // Create a high-resolution canvas (A4 Aspect Ratio: 1920 x 1357)
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1357;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get 2D context for certificate generator');
      }

      // 1. Draw Background (Deep Slate / Graphite Theme)
      ctx.fillStyle = '#0f172a'; // Deep Slate
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Subtle Technical Grid Lines
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.04)'; // Subtle Tech Blue grid
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 3. Draw Outer Border (Double Lines)
      const paddingOuter = 40;
      const paddingInner = 50;

      // Outer thin gold/orange line
      ctx.strokeStyle = '#f97316'; // Allplan Orange
      ctx.lineWidth = 2;
      ctx.strokeRect(paddingOuter, paddingOuter, canvas.width - paddingOuter * 2, canvas.height - paddingOuter * 2);

      // Inner thick slate/blue line
      ctx.strokeStyle = '#3b82f6'; // Tech Blue
      ctx.lineWidth = 6;
      ctx.strokeRect(paddingInner, paddingInner, canvas.width - paddingInner * 2, canvas.height - paddingInner * 2);

      // Double line accent
      ctx.strokeStyle = '#1e293b'; 
      ctx.lineWidth = 2;
      ctx.strokeRect(paddingInner + 10, paddingInner + 10, canvas.width - (paddingInner + 10) * 2, canvas.height - (paddingInner + 10) * 2);

      // 4. Draw Corner Technical Crosshairs & Accents
      const drawCornerAccent = (x: number, y: number, xDir: number, yDir: number) => {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3;
        // Crosshair
        ctx.beginPath();
        ctx.moveTo(x - 20, y);
        ctx.lineTo(x + 20, y);
        ctx.moveTo(x, y - 20);
        ctx.lineTo(x, y + 20);
        ctx.stroke();

        // Corner L-shape brackets
        ctx.strokeStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(x + xDir * 40, y);
        ctx.lineTo(x + xDir * 10, y);
        ctx.lineTo(x + xDir * 10, y + yDir * 30);
        ctx.stroke();
      };

      drawCornerAccent(paddingInner + 30, paddingInner + 30, 1, 1);
      drawCornerAccent(canvas.width - (paddingInner + 30), paddingInner + 30, -1, 1);
      drawCornerAccent(paddingInner + 30, canvas.height - (paddingInner + 30), 1, -1);
      drawCornerAccent(canvas.width - (paddingInner + 30), canvas.height - (paddingInner + 30), -1, -1);

      // 5. Technical Watermark / Geometric Accent in Center
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.02)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 400, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 450, 0, Math.PI * 2);
      ctx.setLineDash([5, 15]);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // 6. Draw Top Header Credentials Info
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ALLPLAN CERTIFICATION DEPT · OFFICE OF EDUCATION', paddingInner + 50, paddingInner + 40);
      
      ctx.textAlign = 'right';
      ctx.fillText(`CERTIFICATE ID: ${certId}`, canvas.width - (paddingInner + 50), paddingInner + 40);

      // 7. Draw "ALLPLAN ACADEMY" Brand Header
      ctx.textAlign = 'center';
      
      // Brand Name
      ctx.fillStyle = '#3b82f6'; // Tech Blue
      ctx.font = 'black 60px "Inter", sans-serif';
      ctx.font = '900 64px sans-serif';
      ctx.fillText('ALLPLAN', canvas.width / 2 - 80, 240);

      // Academy Tag
      ctx.fillStyle = '#0f172a';
      const tagText = 'ACADEMY';
      ctx.font = 'bold 16px monospace';
      const tagWidth = ctx.measureText(tagText).width + 30;
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(canvas.width / 2 + 120, 200, tagWidth, 38);
      ctx.strokeRect(canvas.width / 2 + 120, 200, tagWidth, 38);

      ctx.fillStyle = '#3b82f6';
      ctx.textAlign = 'center';
      ctx.fillText(tagText, canvas.width / 2 + 120 + tagWidth / 2, 224);

      // Verifiable Professional Credential subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px monospace';
      ctx.letterSpacing = '5px';
      ctx.fillText('VERIFIABLE TECHNICAL CREDENTIAL', canvas.width / 2, 290);
      ctx.letterSpacing = '0px'; // Reset letter spacing

      // Simple divider
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 200, 320);
      ctx.lineTo(canvas.width / 2 + 200, 320);
      ctx.stroke();

      // 8. Certificate Main Statement
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('This is to certify that the engineering candidate', canvas.width / 2, 420);

      // Recipient Name (Beautiful big white/gold gradient name)
      const gradient = ctx.createLinearGradient(canvas.width / 2 - 300, 0, canvas.width / 2 + 300, 0);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, '#f8fafc');
      gradient.addColorStop(1, '#e2e8f0');

      ctx.fillStyle = gradient;
      ctx.font = '900 68px sans-serif';
      ctx.fillText(studentName, canvas.width / 2, 510);

      // Name underlines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 400, 545);
      ctx.lineTo(canvas.width / 2 + 400, 545);
      ctx.stroke();

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 250, 552);
      ctx.lineTo(canvas.width / 2 + 250, 552);
      ctx.stroke();

      // Core content body text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, currentY);
      };

      const descriptionText = 'has successfully completed the extensive technical syllabus, practical exercises, and master examinations in advanced 3D reinforcement modeling, Eurocode 2 engineering constraints, and structural BIM drafting.';
      wrapText(descriptionText, canvas.width / 2, 605, 1000, 26);

      // 9. Qualification Badge Banner
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(canvas.width / 2 - 500, 700, 1000, 75);
      ctx.strokeStyle = '#f97316'; // Gold/orange highlight
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width / 2 - 500, 700, 1000, 75);

      ctx.fillStyle = '#f97316';
      ctx.font = '900 24px sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText(courseTitle.toUpperCase(), canvas.width / 2, 747);
      ctx.letterSpacing = '0px';

      // 10. Verification Seal & Stamp (Drawn procedurally on the bottom center)
      const sealX = canvas.width / 2;
      const sealY = 950;
      
      // Draw Seal Circles
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sealX, sealY, 70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sealX, sealY, 60, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glowing center
      ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
      ctx.beginPath();
      ctx.arc(sealX, sealY, 60, 0, Math.PI * 2);
      ctx.fill();

      // Custom Star/Crosshair in the center of the seal
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sealX - 15, sealY);
      ctx.lineTo(sealX + 15, sealY);
      ctx.moveTo(sealX, sealY - 15);
      ctx.lineTo(sealX, sealY + 15);
      ctx.stroke();

      // Circular Seal text
      ctx.fillStyle = '#f97316';
      ctx.font = '900 7px monospace';
      const sealText = 'ALLPLAN ACADEMY * SEAL OF ACADEMIC EXCELLENCE *';
      const chars = sealText.split('');
      const radius = 50;
      const angleDecrement = (Math.PI * 2) / chars.length;

      for (let i = 0; i < chars.length; i++) {
        const charAngle = i * angleDecrement - Math.PI / 2;
        ctx.save();
        ctx.translate(sealX + Math.cos(charAngle) * radius, sealY + Math.sin(charAngle) * radius);
        ctx.rotate(charAngle + Math.PI / 2);
        ctx.fillText(chars[i], 0, 0);
        ctx.restore();
      }

      // Verification Code Text under seal
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`VERIFIED_HASH: ${verificationHash}`, sealX, sealY + 100);

      // 11. Hand-Drawn Mock Signatures

      // Left Signature Area
      const sig1X = canvas.width / 4;
      const sig1Y = 940;

      // Draw Eduard Müller signature stroke
      ctx.strokeStyle = '#38bdf8'; // Soft cyan ink
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sig1X - 70, sig1Y + 15);
      ctx.bezierCurveTo(sig1X - 40, sig1Y - 30, sig1X - 10, sig1Y + 5, sig1X + 10, sig1Y - 20);
      ctx.bezierCurveTo(sig1X + 30, sig1Y + 10, sig1X + 50, sig1Y - 15, sig1X + 70, sig1Y + 5);
      // Underline stroke
      ctx.moveTo(sig1X - 85, sig1Y + 20);
      ctx.bezierCurveTo(sig1X - 30, sig1Y + 25, sig1X + 30, sig1Y + 15, sig1X + 80, sig1Y + 22);
      ctx.stroke();

      // Signature Label 1
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'italic 16px sans-serif';
      ctx.fillText('Eduard Müller', sig1X, sig1Y + 10);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sig1X - 100, sig1Y + 35);
      ctx.lineTo(sig1X + 100, sig1Y + 35);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('DIRECTOR OF BIM EDUCATION', sig1X, sig1Y + 52);
      ctx.fillText('ALLPLAN ACADEMY GMBH', sig1X, sig1Y + 68);

      // Right Signature Area
      const sig2X = (canvas.width * 3) / 4;
      const sig2Y = 940;

      // Draw Mehmet Soydan signature stroke
      ctx.strokeStyle = '#38bdf8'; // Ink color
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sig2X - 65, sig2Y + 10);
      ctx.bezierCurveTo(sig2X - 35, sig2Y - 25, sig2X - 20, sig2Y + 25, sig2X, sig2Y - 30);
      ctx.bezierCurveTo(sig2X + 20, sig2Y + 25, sig2X + 40, sig2Y - 5, sig2X + 70, sig2Y - 10);
      // Loop loop
      ctx.moveTo(sig2X - 80, sig2Y + 22);
      ctx.bezierCurveTo(sig2X - 20, sig2Y + 20, sig2X + 20, sig2Y + 30, sig2X + 75, sig2Y + 18);
      ctx.stroke();

      // Signature Label 2
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'italic 16px sans-serif';
      ctx.fillText('Mehmet Soydan', sig2X, sig2Y + 10);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sig2X - 100, sig2Y + 35);
      ctx.lineTo(sig2X + 100, sig2Y + 35);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('SENIOR BIM SPECIALIST', sig2X, sig2Y + 52);
      ctx.fillText('ALLPLAN VERIFICATION PANEL', sig2X, sig2Y + 68);

      // 12. Bottom System Footnotes
      const footerY = canvas.height - (paddingInner + 30);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`GENERATED: ${dateStr} · GLOBAL METRIC STORES`, paddingInner + 50, footerY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#3b82f6';
      ctx.fillText(`LICENSE HASH: ${verificationHash}`, canvas.width - (paddingInner + 50), footerY);

      // 13. Trigger instant browser download!
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Allplan_BIM_Certificate_${studentName.trim().replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      resolve();
    } catch (err) {
      console.error('Error generating certificate canvas:', err);
      reject(err);
    }
  });
}
