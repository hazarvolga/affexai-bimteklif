import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { z } from 'zod';
import officialCatalogsJson from './data/csb-2026-official-catalogs.json';

export interface ParsedPriceRow {
  itemCode: string;
  itemName: string;
  unit: string;
  price: string;
}

export interface OfficialCsbCatalog {
  id: string;
  title: string;
  fileName: string;
  documentHash: string;
  licenseReference: string;
  validityStart: string;
  validityEnd: string;
  totalMatchedInPdf: number;
  rows: ParsedPriceRow[];
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((val) => Number.isFinite(Date.parse(val)) && new Date(val).toISOString().slice(0, 10) === val);

const pdfImportRequestSchema = z
  .object({
    pdfBase64: z.string().min(16).max(50_000_000),
    fileName: z.string().trim().min(1).max(200),
    licenseConfirmed: z.literal(true),
    licenseReference: z.string().trim().min(5).max(1000),
    validityStart: dateSchema,
    validityEnd: dateSchema,
    autoApprove: z.boolean().optional(),
    maxRows: z.number().int().min(1).max(20_000).optional(),
  })
  .refine((val) => val.validityStart <= val.validityEnd, 'Geçerlilik aralığı hatalı');

const CATALOGS: Record<string, OfficialCsbCatalog> = officialCatalogsJson as Record<string, OfficialCsbCatalog>;

export interface OfficialCatalogCoverageItem extends Omit<OfficialCsbCatalog, 'rows'> {
  rowCount: number;
  coveragePercent: number;
  isFullCoverage: boolean;
}

export function listOfficialCsbCatalogs(): OfficialCatalogCoverageItem[] {
  return Object.values(CATALOGS).map(({ rows, ...meta }) => {
    const rowCount = rows.length;
    const total = meta.totalMatchedInPdf > 0 ? meta.totalMatchedInPdf : rowCount;
    const coveragePercent = total > 0 ? Math.round((rowCount / total) * 10_000) / 100 : 100;
    return {
      ...meta,
      rowCount,
      coveragePercent,
      isFullCoverage: rowCount >= total && total > 0,
    };
  });
}

export function getOfficialCatalogCoverageReport() {
  const books = listOfficialCsbCatalogs();
  const totalRowsInBooks = books.reduce((sum, b) => sum + b.rowCount, 0);
  const totalMatchedInPdfs = books.reduce((sum, b) => sum + b.totalMatchedInPdf, 0);
  const fullCoverageBookCount = books.filter((b) => b.isFullCoverage).length;
  return {
    generatedAt: '2026-10-17',
    bookCount: books.length,
    fullCoverageBookCount,
    totalRowsInBooks,
    totalMatchedInPdfs,
    overallCoveragePercent:
      totalMatchedInPdfs > 0 ? Math.round((totalRowsInBooks / totalMatchedInPdfs) * 10_000) / 100 : 100,
    books,
  };
}

export function getOfficialCsbCatalogById(catalogId: string): OfficialCsbCatalog | null {
  return CATALOGS[catalogId] ?? null;
}

function normalizeUnit(rawUnit: string): string {
  const cleaned = rawUnit.replace(/\s+/g, ' ').trim();
  const lower = cleaned.toLowerCase();
  if (lower === 'ton') return 'ton';
  if (lower === 'ad' || lower === 'adet') return 'adet';
  if (lower === '1000 ad') return '1000 adet';
  if (lower === 'sa' || lower === 'saat') return 'saat';
  if (lower === 'kg') return 'kg';
  if (lower === 'lt') return 'lt';
  if (lower === 'tk' || lower === 'takım') return 'takım';
  if (lower === '100 m²' || lower === '100m²') return '100 m²';
  return cleaned;
}

function trDecimalToDot(raw: string): string | null {
  const normalized = raw.trim().replace(/\./g, '').replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num.toFixed(2);
}

function sanitizeDescription(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

/**
 * Parses extracted text from any official ÇŞB PDF format into structured price rows:
 * 1) Aylık/Güncel ÇŞB Birim Fiyat & Rayiç Listeleri (15.xxx.xxxx, 10.xxx.xxxx, 20.xxx.xxxx, 25.xxx.xxxx, 35.xxx.xxxx)
 * 2) Ocak Ana Birim Fiyat Kitabı (10.130.1201 2.850,00Ton Fabrikada)
 * 3) Mimarlık ve Mühendislik Hizmet Bedelleri Yapı Yaklaşık Birim Maliyetleri Tebliği (I-A .. V-E TL/m²)
 */
export function parseCsbPdfText(text: string, maxRows = 600): ParsedPriceRow[] {
  const rows: ParsedPriceRow[] = [];
  const seen = new Set<string>();

  // Format 1: Mimarlık ve Mühendislik Yapı Yaklaşık Birim Maliyetleri Tebliği (I. SINIF (A) GRUBU YAPILAR ... 2.600,00 TL/m²)
  const yearMatch = text.match(/\b(202[4-9])\s+YILI\s+YAPI\s+YAKLAŞIK\s+BİRİM/i);
  const tebligYear = yearMatch ? yearMatch[1] : '2026';
  const tebligRegex = /([IVX]+)\.\s*SINIF\s*\(([A-Z])\)\s*GRUBU\s*YAPILAR[.\s…]*((?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*TL\/m²/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tebligRegex.exec(text)) !== null) {
    const sinif = tm[1].toUpperCase();
    const grup = tm[2].toUpperCase();
    const price = trDecimalToDot(tm[3]);
    const itemCode = `YBM-${tebligYear}-${sinif}-${grup}`;
    if (price && !seen.has(itemCode)) {
      seen.add(itemCode);
      rows.push({
        itemCode,
        itemName: `${tebligYear} Yılı Yapı Yaklaşık Birim Maliyeti — ${sinif}. Sınıf (${grup}) Grubu Yapılar (KDV Hariç, %15 Genel Gider + %10 Kâr Dahil)`,
        unit: 'm²',
        price,
      });
    }
  }

  // Format 2: Aylık Güncel ÇŞB Birim Fiyat ve Rayiç Listeleri
  // Example: 15.100.1001 1 ton her cins çimento... Ton 263,85
  // Example: 25.100.1001 25x40 cm vidalı Ad 1.196,58 400,29
  const monthlyRegex =
    /^\s*(\d{2}\.\d{3}\.\d{4})\s+([\s\S]*?)\s+(Ton|m³|m²|m|Ad|1000\s*Ad|100\s*m²|Sa|Kg|kg|lt|Lt|Takım|Tk|Set|Gr|gr|Gün|Ay|Km|km|Ha)\s+((?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})(?:\s+((?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}))?\s*$/gm;
  let mm: RegExpExecArray | null;
  while ((mm = monthlyRegex.exec(text)) !== null) {
    if (rows.length >= maxRows) break;
    const itemCode = mm[1].trim();
    if (seen.has(itemCode)) continue;
    const price = trDecimalToDot(mm[4]);
    if (!price) continue;
    let desc = sanitizeDescription(mm[2]);
    if (!desc) desc = `ÇŞB Poz ${itemCode}`;
    if (mm[5]) {
      desc = sanitizeDescription(`${desc} (Montaj Bedeli: ${mm[5].trim()} TL)`);
    }
    seen.add(itemCode);
    rows.push({
      itemCode,
      itemName: desc,
      unit: normalizeUnit(mm[3]),
      price,
    });
  }

  // Format 3: Ocak Ana Kitap Rayiç Format (e.g. "Portland çimentosu ... 10.130.1201 2.850,00Ton Fabrikada")
  if (rows.length < maxRows) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const bookLineRegex = /^(\d{2}\.\d{3}\.\d{4})\s+((?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*(Ton|m³|m²|m|Ad|1000\s*Ad|Sa|Kg|kg|lt|Lt|Takım|Tk|Set)\b(?:\s+(.+))?$/i;
    for (let i = 0; i < lines.length && rows.length < maxRows; i++) {
      const bm = lines[i].match(bookLineRegex);
      if (!bm) continue;
      const itemCode = bm[1].trim();
      if (seen.has(itemCode)) continue;
      const price = trDecimalToDot(bm[2]);
      if (!price) continue;
      const prevDesc = [lines[i - 2], lines[i - 1]]
        .filter((prev) => prev && !bookLineRegex.test(prev) && !/^(01\.01\.|Sıra|Poz No|Tanımı)/i.test(prev))
        .join(' ');
      const place = bm[4] ? ` (${bm[4].trim()})` : '';
      const itemName = sanitizeDescription(`${prevDesc || `ÇŞB Rayiç ${itemCode}`}${place}`);
      seen.add(itemCode);
      rows.push({
        itemCode,
        itemName: itemName || `ÇŞB Rayiç ${itemCode}`,
        unit: normalizeUnit(bm[3]),
        price,
      });
    }
  }

  // Format 4: Rayiç – TÜİK Endeks Eşleştirme PDFs (when no TL price column exists, extract distinct TÜİK index mappings)
  if (rows.length === 0) {
    const tuikRegex =
      /^\s*(\d{2}\.\d{3}\.\d{4})\s*([^\n\r]{3,140}?)\s*(?:(Ad|m²|m³|m|Sa|Ton|Kg)\s*)?(TÜFE|\d{2}(?:\.\d{1,2})?)\s+([A-ZÇĞİÖŞÜa-zçğıöşü][^\n\r]{3,100})$/gm;
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tuikRegex.exec(text)) !== null) {
      if (rows.length >= maxRows) break;
      const pozCode = tMatch[1].trim();
      const tuikCode = tMatch[4].trim();
      const itemCode = `TUIK-${tuikCode}-${pozCode}`;
      if (seen.has(itemCode)) continue;
      seen.add(itemCode);
      const desc = sanitizeDescription(`${tMatch[2]} — TÜİK Endeks: ${tuikCode} (${tMatch[5].trim()})`);
      rows.push({
        itemCode,
        itemName: desc,
        unit: 'endeks',
        price: '100.00',
      });
    }
  }

  return rows;
}

/**
 * Pure Node.js fallback PDF text extractor for FlateDecode content streams
 * when neither `pdftotext` nor `python3 pypdf` is available.
 */
function extractPdfTextPureNode(pdfBuffer: Buffer): string {
  const chunks: string[] = [];
  const raw = pdfBuffer.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRegex.exec(raw)) !== null) {
    const startOffset = m.index + m[0].indexOf('\n') + 1;
    const endOffset = m.index + m[0].lastIndexOf('endstream');
    const slice = pdfBuffer.subarray(startOffset, endOffset).subarray(
      0,
      endOffset - startOffset - (pdfBuffer[endOffset - 1] === 0x0a ? (pdfBuffer[endOffset - 2] === 0x0d ? 2 : 1) : 0)
    );
    let decoded = '';
    try {
      decoded = zlib.inflateSync(slice).toString('latin1');
    } catch {
      decoded = slice.toString('latin1');
    }
    if (!decoded.includes('BT') && !decoded.includes('Tj') && !decoded.includes('TJ')) continue;
    const strTokens = decoded.match(/\((?:\\.|[^\\()])*\)/g);
    if (strTokens) {
      const line = strTokens
        .map((tok) =>
          tok
            .slice(1, -1)
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\\([()\\])/g, '$1')
        )
        .join(' ');
      chunks.push(line);
    }
  }
  return chunks.join('\n');
}

export function extractTextFromPdfBuffer(pdfBuffer: Buffer): string {
  const tmpFile = path.join(os.tmpdir(), `csb-import-${process.pid}-${Date.now()}.pdf`);
  try {
    fs.writeFileSync(tmpFile, pdfBuffer);
    // 1. Try pdftotext if installed
    try {
      const out = execFileSync('pdftotext', ['-raw', tmpFile, '-'], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        timeout: 20_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      if (out && out.trim().length > 20) return out;
    } catch {
      // Fall through to python3 pypdf
    }

    // 2. Try python3 pypdf
    const pyBins = [process.env.PYTHON_BIN, '/opt/venv/bin/python3', 'python3'].filter(Boolean) as string[];
    for (const pyBin of pyBins) {
      try {
        const out = execFileSync(
          pyBin,
          [
            '-c',
            'import sys, pypdf; r = pypdf.PdfReader(sys.argv[1]); print("\\n".join(p.extract_text() or "" for p in r.pages))',
            tmpFile,
          ],
          {
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
            timeout: 30_000,
            stdio: ['ignore', 'pipe', 'ignore'],
          }
        );
        if (out && out.trim().length > 20) return out;
      } catch {
        // Continue
      }
    }
  } finally {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      // Ignore cleanup error
    }
  }

  // 3. Pure Node.js fallback
  return extractPdfTextPureNode(pdfBuffer);
}

export function parseCsbPdfDocument(input: unknown) {
  const data = pdfImportRequestSchema.parse(input);
  const cleanBase64 = data.pdfBase64.replace(/^data:application\/pdf;base64,/i, '').trim();
  const pdfBuffer = Buffer.from(cleanBase64, 'base64');

  if (pdfBuffer.length < 32 || pdfBuffer.length > 36 * 1024 * 1024) {
    throw new Error('PDF dosya boyutu geçersiz (en fazla 35 MB).');
  }
  const headerSlice = pdfBuffer.subarray(0, Math.min(1024, pdfBuffer.length)).toString('latin1');
  if (!headerSlice.includes('%PDF-')) {
    throw new Error('Geçerli bir PDF dosyası (%PDF- başlığı) tespit edilemedi.');
  }

  const documentHash = createHash('sha256').update(pdfBuffer).digest('hex');

  // Check if the uploaded PDF matches one of our pre-verified official 2026 catalogs by exact SHA-256 hash
  const matchedCatalog = Object.values(CATALOGS).find((c) => c.documentHash === documentHash);
  const maxRows = data.maxRows ?? (matchedCatalog ? matchedCatalog.rows.length : 5000);

  let rows: ParsedPriceRow[] = [];
  if (matchedCatalog && matchedCatalog.rows.length > 0) {
    rows = matchedCatalog.rows.slice(0, maxRows);
  } else {
    const extractedText = extractTextFromPdfBuffer(pdfBuffer);
    rows = parseCsbPdfText(extractedText, maxRows);
  }

  if (rows.length === 0) {
    throw new Error(
      'PDF içinden geçerli ÇŞB poz veya birim maliyet tablosu çıkarılamadı. Lütfen resmi ÇŞB Birim Fiyat, Rayiç veya Yapı Yaklaşık Maliyet Tebliği PDF dosyası yükleyin.'
    );
  }

  const versionHash = createHash('sha256')
    .update(
      JSON.stringify({
        documentHash,
        licenseReference: data.licenseReference,
        validityStart: data.validityStart,
        validityEnd: data.validityEnd,
      })
    )
    .digest('hex');

  return {
    fileName: data.fileName,
    licenseConfirmed: data.licenseConfirmed,
    licenseReference: data.licenseReference,
    validityStart: data.validityStart,
    validityEnd: data.validityEnd,
    autoApprove: data.autoApprove,
    rows,
    documentHash,
    versionHash,
  };
}
