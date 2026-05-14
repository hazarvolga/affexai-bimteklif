import puppeteer from 'puppeteer';
import { db } from '../../db';
import { quotations, quotationItems, companies, clients } from '../../db/schema';
import { and, eq } from 'drizzle-orm';
import { templates, PdfData } from './templates';

/**
 * Professional PDF Generation Engine
 */
export async function generateQuotationPdf(quotationId: string, templateId: string = "default_construction", companyId?: string): Promise<Buffer> {
  // 1. Fetch Data
  const quote = await db.query.quotations.findFirst({
    where: companyId
      ? and(eq(quotations.id, quotationId), eq(quotations.companyId, companyId))
      : eq(quotations.id, quotationId),
  });

  if (!quote) throw new Error("Quotation not found");

  const [company, clientData, items] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, quote.companyId) }),
    db.query.clients.findFirst({ where: and(eq(clients.id, quote.clientId), eq(clients.companyId, quote.companyId)) }),
    db.select().from(quotationItems).where(and(eq(quotationItems.quotationId, quotationId), eq(quotationItems.companyId, quote.companyId)))
  ]);

  if (!company) throw new Error("Company not found");
  if (!clientData) throw new Error("Client not found");

  // 2. Prepare Template Data
  const pdfData: PdfData = {
    company: {
      name: company.name,
      address: company.address || undefined,
      phone: company.phone || undefined,
      email: company.email || undefined,
      taxNumber: company.taxNumber || undefined,
    },
    client: {
      name: clientData.name,
      address: clientData.address || undefined,
      email: clientData.email || undefined,
      phone: clientData.phone || undefined,
    },
    quotation: {
      quoteNumber: quote.quoteNumber,
      projectName: quote.projectName,
      date: new Date(quote.date).toLocaleDateString('tr-TR'),
      expiryDate: new Date(quote.expiryDate).toLocaleDateString('tr-TR'),
      currency: quote.currency,
      status: quote.status as any,
      revisionVersion: quote.revisionVersion,
      subtotal: Number(quote.subtotal),
      discountTotal: Number(quote.discountTotal),
      vatTotal: Number(quote.vatTotal),
      grandTotal: Number(quote.grandTotal),
    },
    items: items.map(item => ({
      description: item.description,
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number(item.discountPercent),
      vatPercent: Number(item.vatPercent),
      total: Number(item.total),
    }))
  };

  // 3. Render HTML
  const template = templates.find(t => t.id === templateId) || templates[0];
  const html = template.htmlTemplate(pdfData);

  // 4. Generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' as any });
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px'
    }
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}
