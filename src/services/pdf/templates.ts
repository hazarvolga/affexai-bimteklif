import { QuoteStatus } from "../../types";

export interface PdfTemplate {
  id: string;
  name: string;
  htmlTemplate: (data: PdfData) => string;
}

export interface PdfData {
  company: {
    name: string;
    logo?: string;
    taxNumber?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  client: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  quotation: {
    quoteNumber: string;
    projectName: string;
    date: string;
    expiryDate: string;
    currency: string;
    status: QuoteStatus;
    revisionVersion: number;
    subtotal: number;
    discountTotal: number;
    vatTotal: number;
    grandTotal: number;
  };
  items: Array<{
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    vatPercent: number;
    total: number;
  }>;
  evidenceSummary?: {
    verifiedItemCount: number;
    sourceDocumentCount: number;
    ruleVersions: string[];
  };
}

const evidenceSummaryHtml = (data: PdfData) => data.evidenceSummary ? `
  <div class="terms" style="border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px;">
    <div style="font-weight: 800; color: #18181b;">Kaynak ve doğrulama özeti</div>
    <div>${data.evidenceSummary.verifiedItemCount} kalem insan onaylı kaynak iziyle aktarıldı; ${data.evidenceSummary.sourceDocumentCount} kaynak doküman kullanıldı.</div>
    <div>Kural sürümleri: ${data.evidenceSummary.ruleVersions.join(", ") || "Pilot bütünlük kontrolleri"}. Ham dosya ve hassas iç maliyet verisi bu özete eklenmemiştir.</div>
  </div>` : "";

const commonStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
  body { font-family: 'Inter', sans-serif; color: #18181b; margin: 0; padding: 40px; font-size: 11pt; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f4f4f5; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 24pt; font-weight: 800; color: #ea580c; }
  .company-info { text-align: right; font-size: 9pt; color: #71717a; }
  .section-title { font-size: 10pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa; margin-bottom: 10px; }
  .client-project-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
  .info-box { background: #fafafa; padding: 15px; border-radius: 8px; border: 1px solid #f4f4f5; }
  .info-item { margin-bottom: 5px; }
  .info-label { font-weight: 700; font-size: 8pt; color: #71717a; margin-right: 5px; }
  
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { text-align: left; background: #18181b; color: white; padding: 10px; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; }
  td { padding: 10px; border-bottom: 1px solid #f4f4f5; font-size: 9pt; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  
  .totals-container { display: flex; justify-content: flex-end; }
  .totals-box { width: 250px; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
  .grand-total { border-top: 2px solid #ea580c; margin-top: 10px; padding-top: 10px; font-weight: 800; color: #ea580c; font-size: 14pt; }
  
  .terms { margin-top: 50px; font-size: 8pt; color: #71717a; border-top: 1px dashed #e4e4e7; padding-top: 20px; }
  .footer { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; }
  .signature-box { border-top: 1px solid #d4d4d8; padding-top: 10px; height: 80px; }
  .stamp-placeholder { border: 2px dashed #e4e4e7; border-radius: 50%; width: 100px; height: 100px; margin: 0 auto; display: flex; items-center; justify-content: center; font-size: 7pt; color: #e4e4e7; }
`;

export const templates: PdfTemplate[] = [
  {
    id: "default_construction",
    name: "Modern İnşaat",
    htmlTemplate: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>${commonStyles}</style>
      </head>
      <body>
        <div class="header">
          <div class="logo">TeklifPro AI</div>
          <div class="company-info">
            <div style="font-weight: 800; color: #18181b; font-size: 12pt;">${data.company.name}</div>
            <div>${data.company.address || ""}</div>
            <div>${data.company.phone || ""} | ${data.company.email || ""}</div>
            <div>Vergi No: ${data.company.taxNumber || "-"}</div>
          </div>
        </div>

        <div class="client-project-grid">
          <div>
            <div class="section-title">Müşteri Bilgileri</div>
            <div class="info-box">
              <div class="info-item"><span class="info-label">İsim:</span> ${data.client.name}</div>
              <div class="info-item"><span class="info-label">Adres:</span> ${data.client.address || "-"}</div>
              <div class="info-item"><span class="info-label">E-posta:</span> ${data.client.email || "-"}</div>
            </div>
          </div>
          <div>
            <div class="section-title">Teklif Detayları</div>
            <div class="info-box">
              <div class="info-item"><span class="info-label">Proje:</span> ${data.quotation.projectName}</div>
              <div class="info-item"><span class="info-label">Teklif No:</span> #${data.quotation.quoteNumber} (v${data.quotation.revisionVersion})</div>
              <div class="info-item"><span class="info-label">Tarih:</span> ${data.quotation.date}</div>
              <div class="info-item"><span class="info-label">Geçerlilik:</span> ${data.quotation.expiryDate}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Açıklama</th>
              <th class="text-center">Birim</th>
              <th class="text-right">Miktar</th>
              <th class="text-right">Birim Fiyat</th>
              <th class="text-right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td class="text-center">${item.unit}</td>
                <td class="text-right font-mono">${item.quantity}</td>
                <td class="text-right font-mono">${item.unitPrice.toLocaleString('tr-TR')} ${data.quotation.currency}</td>
                <td class="text-right font-mono" style="font-weight: 700;">${item.total.toLocaleString('tr-TR')} ${data.quotation.currency}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-container">
          <div class="totals-box">
            <div class="total-row"><span>Ara Toplam:</span> <span class="font-mono">${data.quotation.subtotal.toLocaleString('tr-TR')} ${data.quotation.currency}</span></div>
            <div class="total-row"><span>İndirim:</span> <span class="font-mono" style="color: #ea580c">-${data.quotation.discountTotal.toLocaleString('tr-TR')} ${data.quotation.currency}</span></div>
            <div class="total-row"><span>KDV:</span> <span class="font-mono">${data.quotation.vatTotal.toLocaleString('tr-TR')} ${data.quotation.currency}</span></div>
            <div class="total-row grand-total"><span>TOPLAM:</span> <span class="font-mono">${data.quotation.grandTotal.toLocaleString('tr-TR')} ${data.quotation.currency}</span></div>
          </div>
        </div>

        ${evidenceSummaryHtml(data)}
        <div class="terms">
          <div style="font-weight: 800; margin-bottom: 5px; color: #18181b;">Şartlar ve Koşullar:</div>
          <div style="margin-bottom: 3px;">• Bu teklif hazırlandığı tarihten itibaren 7 gün geçerlidir.</div>
          <div style="margin-bottom: 3px;">• Malzeme fiyatlarındaki aşırı artışlar teklife yansıtılabilir.</div>
          <div style="margin-bottom: 3px;">• Ödeme planı karşılıklı mutabakat sonrası netleştirilecektir.</div>
          <div style="margin-bottom: 3px;">• KDV oranları yasal mevzuat gereği değiştirilebilir.</div>
        </div>

        <div class="footer">
          <div>
            <div class="stamp-placeholder">KAŞE</div>
            <div class="signature-box" style="margin-top: 10px;">Şirket Yetkilisi <br/> <span style="font-size: 7pt; color: #a1a1aa;">İmza / Tarih</span></div>
          </div>
          <div>
            <div style="height: 100px;"></div>
            <div class="signature-box">Müşteri Onayı <br/> <span style="font-size: 7pt; color: #a1a1aa;">İmza / Tarih</span></div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  {
    id: "luxury_villa",
    name: "Lüks Villla Projesi",
    htmlTemplate: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          .header { border-bottom: 4px solid #1e1b4b; }
          .logo { color: #1e1b4b; font-family:serif; }
          .grand-total { border-top: 2px solid #1e1b4b; color: #1e1b4b; }
          .info-box { border-left: 4px solid #1e1b4b; }
          th { background: #1e1b4b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">LUXURY ESTATES</div>
          <div class="company-info">
            <div style="font-weight: 800; color: #18181b; font-size: 12pt;">${data.company.name}</div>
            <div>${data.company.address || ""}</div>
            <div>${data.company.phone || ""} | ${data.company.email || ""}</div>
            <div>Vergi No: ${data.company.taxNumber || "-"}</div>
          </div>
        </div>

        <div class="client-project-grid">
          <div>
            <div class="section-title">Sayın</div>
            <div class="info-box">
              <div class="info-item"><span style="font-size: 14pt; font-weight: 700;">${data.client.name}</span></div>
              <div class="info-item">${data.client.address || "-"}</div>
            </div>
          </div>
          <div>
            <div class="section-title">Teklif Referans</div>
            <div class="info-box">
              <div class="info-item"><span class="info-label">PROJE:</span> ${data.quotation.projectName}</div>
              <div class="info-item"><span class="info-label">REF:</span> ${data.quotation.quoteNumber}</div>
              <div class="info-item"><span class="info-label">TARİH:</span> ${data.quotation.date}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>DETAYLI AÇIKLAMA</th>
              <th class="text-center">BİRİM</th>
              <th class="text-right">ADET</th>
              <th class="text-right">BİRİM FİYAT</th>
              <th class="text-right">TOPLAM</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td><div style="font-weight: 700;">${item.description}</div></td>
                <td class="text-center">${item.unit}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${item.unitPrice.toLocaleString('tr-TR')} ${data.quotation.currency}</td>
                <td class="text-right" style="font-weight: 700;">${item.total.toLocaleString('tr-TR')} ${data.quotation.currency}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-container">
          <div class="totals-box">
            <div class="total-row"><span>Hakediş Toplamı:</span> <span>${data.quotation.subtotal.toLocaleString('tr-TR')} ${data.quotation.currency}</span></div>
            <div class="total-row"><span>İskonto Kamu:</span> <span style="color: #ea580c">-${data.quotation.discountTotal.toLocaleString('tr-TR')} ${data.quotation.currency}</span></div>
            <div class="total-row"><span>KDV Tevkifat (%20):</span> <span>${data.quotation.vatTotal.toLocaleString('tr-TR')} ${data.quotation.currency}</span></div>
            <div class="total-row grand-total"><span>GENEL YEKÜN:</span> <span>${data.quotation.grandTotal.toLocaleString('tr-TR')} ${data.quotation.currency}</span></div>
          </div>
        </div>

        ${evidenceSummaryHtml(data)}
        <div class="footer">
          <div>
            <div class="signature-box" style="margin-top: 80px;">Yüklenici Kaşe/İmza</div>
          </div>
          <div>
            <div class="signature-box" style="margin-top: 80px;">İşveren Onay</div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  {
    id: "modern_minimal",
    name: "Minimalist Modern",
    htmlTemplate: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${commonStyles}
          body { padding: 60px; font-size: 10pt; }
          .header { border: none; flex-direction: column; align-items: flex-start; gap: 20px; }
          .logo { color: #000; letter-spacing: -0.05em; font-size: 32pt; }
          .company-info { text-align: left; }
          .info-box { background: transparent; border: none; padding: 0; }
          th { background: transparent; color: #71717a; border-bottom: 1px solid #e4e4e7; }
          .grand-total { border-top: 1px solid #000; color: #000; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${data.company.name.split(' ')[0]}</div>
          <div class="company-info">
            <div>${data.company.address || ""}</div>
            <div>${data.company.phone || ""} | ${data.company.email || ""}</div>
          </div>
        </div>

        <div style="margin: 60px 0;">
          <div style="font-size: 24pt; font-weight: 800;">TEKLİF</div>
          <div style="color: #71717a;">NO: ${data.quotation.quoteNumber} | ${data.quotation.date}</div>
        </div>

        <div class="client-project-grid">
           <div>
             <div class="section-title">KİME</div>
             <div class="info-box">
              <div style="font-weight: 700; font-size: 12pt;">${data.client.name}</div>
             </div>
           </div>
           <div>
             <div class="section-title">PROJE</div>
             <div class="info-box">${data.quotation.projectName}</div>
           </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>HİZMET</th>
              <th class="text-right">ADET</th>
              <th class="text-right">FİYAT</th>
              <th class="text-right">TUTAR</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td class="text-right">${item.quantity} ${item.unit}</td>
                <td class="text-right">${item.unitPrice.toLocaleString('tr-TR')}</td>
                <td class="text-right" style="font-weight: 700;">${item.total.toLocaleString('tr-TR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-container">
          <div class="totals-box">
            <div class="total-row"><span>TOPLAM</span> <span style="font-weight: 700;">${data.quotation.grandTotal.toLocaleString('tr-TR')} ${data.quotation.currency}</span></div>
            <div style="font-size: 7pt; color: #a1a1aa; text-align: right; margin-top: 5px;">KDV DAHİLDİR</div>
          </div>
        </div>

        ${evidenceSummaryHtml(data)}
        <div class="footer" style="margin-top: 100px;">
          <div class="signature-box">ONAY</div>
        </div>
      </body>
      </html>
    `
  }
];
