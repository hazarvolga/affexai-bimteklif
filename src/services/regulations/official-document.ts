import { createHash } from 'node:crypto';
import { fetchCrawlerHtml } from '../../server/crawler/safe-fetch';
import type { NormalizedRegulationChange } from '../../smartcheck/sources/adapters';
const MAX_BYTES = 256 * 1024;
export function validateOfficialDocumentUrl(input: unknown): URL {
  if (typeof input !== 'string' || !input.trim()) throw new Error('REGULATION_SOURCE_REQUIRED');
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('REGULATION_SOURCE_NOT_ALLOWED'); }
  const match = /^\/eskiler\/(\d{4})\/(\d{2})\/(\d{8})-\d{1,4}\.html?$/.exec(url.pathname);
  if (url.protocol !== 'https:' || !['www.resmigazete.gov.tr', 'resmigazete.gov.tr'].includes(url.hostname) || url.username || url.password || url.port || url.search || url.hash || !match) throw new Error('REGULATION_SOURCE_NOT_ALLOWED');
  const date = `${match[3].slice(0,4)}-${match[3].slice(4,6)}-${match[3].slice(6,8)}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date || match[1] !== match[3].slice(0,4) || match[2] !== match[3].slice(4,6)) throw new Error('REGULATION_SOURCE_NOT_ALLOWED');
  return url;
}
function decodeEntities(text: string): string {
  const entities: Record<string,string> = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ' };
  return text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|amp|lt|gt|quot|apos|nbsp);/gi, (whole, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? whole;
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2),16) : parseInt(entity.slice(1),10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
  });
}
/** Linear scan; script/style content and HTML never become source excerpt text. */
function plainText(html: string): string {
  const lower = html.toLowerCase();
  const output: string[] = [];
  let cursor = 0;
  while (cursor < html.length) {
    if (html[cursor] !== '<') { output.push(html[cursor++]); continue; }
    const end = html.indexOf('>', cursor + 1);
    if (end < 0) break;
    const tag = lower.slice(cursor + 1,end).trim().split(/\s/,1)[0];
    if (tag === 'script' || tag === 'style') {
      const close = lower.indexOf(`</${tag}`,end + 1);
      cursor = close < 0 ? html.length : close;
    } else { cursor = end + 1; output.push(' '); }
  }
  return decodeEntities(output.join('')).replace(/\s+/g,' ').trim();
}
export function parseOfficialRegulation(input: string, html: string, fetchedAt = new Date()) {
  const url = validateOfficialDocumentUrl(input);
  if (Buffer.byteLength(html,'utf8') > MAX_BYTES) throw new Error('REGULATION_DOCUMENT_TOO_LARGE');
  if (html.includes('�') || /charset\s*=\s*["']?(?:windows-1254|iso-8859-9)/i.test(html)) throw new Error('REGULATION_DOCUMENT_ENCODING_UNSUPPORTED');
  const lower = html.toLowerCase();
  const titleStart = lower.indexOf('<title>');
  const titleEnd = lower.indexOf('</title>',titleStart + 7);
  const title = titleStart >= 0 && titleEnd > titleStart ? plainText(html.slice(titleStart + 7,titleEnd)).slice(0,500) : '';
  const sourceText = plainText(html);
  if (!title || sourceText.length < 80 || /access denied|request rejected|captcha/i.test(title) || !/tebliğ|yönetmelik|kanun|karar|resm[iî]\s+gazete/i.test(sourceText)) throw new Error('REGULATION_DOCUMENT_INVALID');
  const date = url.pathname.split('/').pop()!.slice(0,8);
  const change: NormalizedRegulationChange = { title, summary: sourceText.slice(0,500), category:'legal', impactLevel:'medium', effectiveFrom:null, sourceText:sourceText.slice(0,8000), applicability:'İnceleme bekliyor; yürürlük, kapsam ve teklif etkisi belirlenmedi.' };
  return { sourceUrl:url.toString(), sourceHash:createHash('sha256').update(html).digest('hex'), rawHtml:html, fetchedAt:fetchedAt.toISOString(), publishedAt:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00.000Z`, sourceDocumentIdentifier:url.pathname.split('/').pop()!, licenseStatus:'unknown' as const, change };
}
export type OfficialRegulationDocument = ReturnType<typeof parseOfficialRegulation>;
export async function fetchOfficialRegulation(input: unknown, fetchHtml = fetchCrawlerHtml): Promise<OfficialRegulationDocument> {
  const url = validateOfficialDocumentUrl(input);
  let html: string;
  try { html = await fetchHtml(url.toString()); }
  catch { throw new Error('REGULATION_SOURCE_UNAVAILABLE'); }
  return parseOfficialRegulation(url.toString(),html);
}
