import { createHash } from 'node:crypto';
import type { ParsedPriceRow } from './csb-pdf-parser';
import { checkedDnsLookup, validateCrawlerUrl } from './safe-fetch';

export const TUIK_SDMX_DOC_URL = 'https://veriportali.tuik.gov.tr/tr/sdmx-web-service-documentation';
export const TUIK_SDMX_REST_BASE_URL = 'https://nsiws.tuik.gov.tr/rest';
export const TUIK_OIDC_TOKEN_URL = 'https://giris.tuik.gov.tr/realms/web/protocol/openid-connect/token';

export interface TuikSdmxSeriesSpec {
  itemCode: string;
  naceOrIndicatorCode: string;
  aliases: readonly string[];
  itemName: string;
  dataflowId: 'DF_IME' | 'DF_YI_UFE' | 'DF_TUFE';
  unit: 'endeks';
}

/**
 * Canonical mapping between TÜİK SDMX Dataflows (İME, Yİ-ÜFE NACE Rev.2, TÜFE)
 * and ÇŞB Yüksek Fen Kurulu 2026 Ocak Rayiç – TÜİK Endeks Eşleştirme Tablosu + 4735 Pn Formula.
 */
export const TUIK_SDMX_SERIES_CATALOG: readonly TuikSdmxSeriesSpec[] = [
  {
    itemCode: 'TUIK-IME-GENEL',
    naceOrIndicatorCode: 'IME_GENEL',
    aliases: ['IME_GENEL', 'IME', 'F_IME', 'INSAAT_GENEL', 'TUIK-IME-GENEL'],
    itemName: 'TÜİK İnşaat Maliyet Endeksi Genel (2015=100)',
    dataflowId: 'DF_IME',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-IME-MALZEME',
    naceOrIndicatorCode: 'IME_MALZEME',
    aliases: ['IME_MALZEME', 'MALZEME', 'INSAAT_MALZEME', 'TUIK-IME-MALZEME'],
    itemName: 'TÜİK İnşaat Maliyet Endeksi — Malzeme Endeksi (2015=100)',
    dataflowId: 'DF_IME',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-IME-ISCILIK',
    naceOrIndicatorCode: 'IME_ISCILIK',
    aliases: ['IME_ISCILIK', 'ISCILIK', 'INSAAT_ISCILIK', 'TUIK-IME-ISCILIK'],
    itemName: 'TÜİK İnşaat Maliyet Endeksi — İşçilik Endeksi (2015=100)',
    dataflowId: 'DF_IME',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-IME-BINA',
    naceOrIndicatorCode: 'IME_BINA',
    aliases: ['IME_BINA', 'BINA', 'BINA_INSAATI', 'F41', 'TUIK-IME-BINA'],
    itemName: 'TÜİK Bina İnşaatı Maliyet Endeksi (2015=100)',
    dataflowId: 'DF_IME',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-TUFE-GENEL',
    naceOrIndicatorCode: 'TUFE',
    aliases: ['TUFE', 'TUFE_GENEL', 'CPI', '00', 'TUIK-TUFE-GENEL'],
    itemName: 'İşçilik Rayiçleri (10.100.1001–1062) — TÜFE Tüketici Fiyat Endeksi Genel (2023=100)',
    dataflowId: 'DF_TUFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-08.1-TAS-KUM',
    naceOrIndicatorCode: '08.1',
    aliases: ['08.1', '081', 'CPA_081', 'NACE_081', 'TUIK-08.1-TAS-KUM'],
    itemName: 'Kum, Çakıl, Kırmataş ve Agrega Rayiçleri — TÜİK 08.1 Taş, Kum ve Kil Ocakçılığı Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-16.1-KERESTE',
    naceOrIndicatorCode: '16.1',
    aliases: ['16.1', '161', 'CPA_161', 'NACE_161', 'TUIK-16.1-KERESTE'],
    itemName: 'Ahşap Kalıp ve Kereste Rayiçleri — TÜİK 16.1 Ağaçların Biçilmesi ve Planyalanması Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-19-BITUM-EPS',
    naceOrIndicatorCode: '19',
    aliases: ['19', '19.2', '192', 'CPA_19', 'NACE_19', 'TUIK-19-BITUM-EPS'],
    itemName: 'Bitüm, Su Yalıtımı ve EPS/XPS Isı Yalıtım Levhaları — TÜİK 19 Kok ve Rafine Petrol Ürünleri Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-20.3-BOYA',
    naceOrIndicatorCode: '20.3',
    aliases: ['20.3', '203', 'CPA_203', 'NACE_203', 'TUIK-20.3-BOYA'],
    itemName: 'Boya, Vernik, Astar ve Yapı Kimyasalları — TÜİK 20.3 Boya, Vernik ve Benzeri Kaplayıcı Maddeler Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-22.2-PLASTIK-BORU',
    naceOrIndicatorCode: '22.2',
    aliases: ['22.2', '222', 'CPA_222', 'NACE_222', 'TUIK-22.2-PLASTIK-BORU'],
    itemName: 'PE, HDPE, PP-R ve PVC Boru / Profil Rayiçleri — TÜİK 22.2 Plastik Ürünler Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-23.1-CAM',
    naceOrIndicatorCode: '23.1',
    aliases: ['23.1', '231', 'CPA_231', 'NACE_231', 'TUIK-23.1-CAM'],
    itemName: 'Düz Cam, Isıcam ve Temperli Cam Rayiçleri — TÜİK 23.1 Cam ve Cam Ürünleri Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-23.3-TUGLA-SERAMIK',
    naceOrIndicatorCode: '23.3',
    aliases: ['23.3', '233', 'CPA_233', 'NACE_233', 'TUIK-23.3-TUGLA-SERAMIK'],
    itemName: 'Tuğla, Kiremit, Seramik ve Porselen Kaplama — TÜİK 23.3 Kilden İnşaat Malzemeleri Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-23.4-VITRIFIYE',
    naceOrIndicatorCode: '23.4',
    aliases: ['23.4', '234', 'CPA_234', 'NACE_234', 'TUIK-23.4-VITRIFIYE'],
    itemName: 'Mekanik Vitrifiye (Lavabo, Klozet, Eviye — 20.100.xxxx) — TÜİK 23.4 Diğer Porselen ve Seramik Ürünler Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-23.5-CIMENTO-KIREC',
    naceOrIndicatorCode: '23.5',
    aliases: ['23.5', '235', 'CPA_235', 'NACE_235', 'TUIK-23.5-CIMENTO-KIREC'],
    itemName: 'Portland Çimentosu (CEM I/II 42.5) ve Kireç (10.130.1201) — TÜİK 23.5 Çimento, Kireç ve Alçı Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-23.6-HAZIR-BETON',
    naceOrIndicatorCode: '23.6',
    aliases: ['23.6', '236', 'CPA_236', 'NACE_236', 'TUIK-23.6-HAZIR-BETON'],
    itemName: 'Hazır Beton (C16/20–C50/60) ve Gazbeton / Beton Elemanlar — TÜİK 23.6 Beton, Çimento ve Alçıdan Eşyalar Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-23.7-MERMER-DOGAL-TAS',
    naceOrIndicatorCode: '23.7',
    aliases: ['23.7', '237', 'CPA_237', 'NACE_237', 'TUIK-23.7-MERMER-DOGAL-TAS'],
    itemName: 'Mermer, Traverten, Granit ve Doğaltaş Rayiçleri (10.240.xxxx) — TÜİK 23.7 Taş (Kesilmiş ve Şekil Verilmiş) Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-24.1-DEMIR-CELIK',
    naceOrIndicatorCode: '24.1',
    aliases: ['24.1', '241', 'CPA_241', 'NACE_241', 'TUIK-24.1-DEMIR-CELIK'],
    itemName: 'Nervürlü Beton Çeliği (Ø8–Ø32), Çelik Hasır ve Profil — TÜİK 24.1 Ana Demir-Çelik ve Ferro Alaşımlar Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-24.2-CELIK-BORU',
    naceOrIndicatorCode: '24.2',
    aliases: ['24.2', '242', 'CPA_242', 'NACE_242', 'TUIK-24.2-CELIK-BORU'],
    itemName: 'Çelik Boru, İçi Boş Profiller ve Bağlantı Parçaları — TÜİK 24.2 Çelikten Tüpler ve Borular Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-25.1-YAPISAL-METAL',
    naceOrIndicatorCode: '25.1',
    aliases: ['25.1', '251', 'CPA_251', 'NACE_251', 'TUIK-25.1-YAPISAL-METAL'],
    itemName: 'Metal Kapı, Pencere, Korkuluk ve Yapısal Çelik — TÜİK 25.1 Yapısal Metal Ürünler Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-25.2-KAZAN-RADYATOR',
    naceOrIndicatorCode: '25.2',
    aliases: ['25.2', '252', 'CPA_252', 'NACE_252', 'TUIK-25.2-KAZAN-RADYATOR'],
    itemName: 'Merkezi Isıtma Radyatörleri ve Buhar/Sıcak Su Kazanları — TÜİK 25.2 Metal Tank, Rezervuar ve Radyatör Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-27.1-ELEKTRIK-PANO',
    naceOrIndicatorCode: '27.1',
    aliases: ['27.1', '271', 'CPA_271', 'NACE_271', 'TUIK-27.1-ELEKTRIK-PANO'],
    itemName: 'Dikili Tip Galvaniz Sac Panolar, Şalter ve Transformatörler (30.100.xxxx) — TÜİK 27.1 Elektrik Dağıtım ve Kontrol Cihazları',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-27.3-KABLO',
    naceOrIndicatorCode: '27.3',
    aliases: ['27.3', '273', 'CPA_273', 'NACE_273', 'TUIK-27.3-KABLO'],
    itemName: 'Enerji, Zayıf Akım, Fiber Optik Kablolar ve Tesisat Donanımı — TÜİK 27.3 Kablo ve Teller Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-27.4-AYDINLATMA',
    naceOrIndicatorCode: '27.4',
    aliases: ['27.4', '274', 'CPA_274', 'NACE_274', 'TUIK-27.4-AYDINLATMA'],
    itemName: 'LED Armatürler ve Elektrikli Aydınlatma Ekipmanları — TÜİK 27.4 Elektrikli Aydınlatma Ekipmanları Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-28.1-POMPA-VANA',
    naceOrIndicatorCode: '28.1',
    aliases: ['28.1', '281', 'CPA_281', 'NACE_281', 'TUIK-28.1-POMPA-VANA'],
    itemName: 'Sirkülasyon Pompaları, Hidroforlar, Vanalar ve Armatürler — TÜİK 28.1 Genel Amaçlı Makineler Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
  {
    itemCode: 'TUIK-28.2-KLIMA-HAVALANDIRMA',
    naceOrIndicatorCode: '28.2',
    aliases: ['28.2', '282', 'CPA_282', 'NACE_282', 'TUIK-28.2-KLIMA-HAVALANDIRMA'],
    itemName: 'Klima Santralleri, Fanlar, Chiller ve Asansör Sistemleri — TÜİK 28.2 Diğer Genel Amaçlı Makineler Endeksi',
    dataflowId: 'DF_YI_UFE',
    unit: 'endeks',
  },
];

const SERIES_BY_ALIAS = new Map<string, TuikSdmxSeriesSpec>();
for (const spec of TUIK_SDMX_SERIES_CATALOG) {
  SERIES_BY_ALIAS.set(spec.itemCode.toUpperCase(), spec);
  SERIES_BY_ALIAS.set(spec.naceOrIndicatorCode.toUpperCase(), spec);
  for (const alias of spec.aliases) {
    SERIES_BY_ALIAS.set(alias.toUpperCase(), spec);
  }
}

export function resolveTuikSeriesSpec(rawCode: string): TuikSdmxSeriesSpec | null {
  const cleaned = rawCode.trim().toUpperCase();
  if (!cleaned) return null;
  const direct = SERIES_BY_ALIAS.get(cleaned);
  if (direct) return direct;
  // Match 3-digit or 4-digit NACE Rev.2 codes (e.g., "23.51" -> "23.5", "24.10" -> "24.1", "NACE_R2_24.1")
  const nace4Match = cleaned.match(/\b(\d{2}\.\d)\d?\b/);
  if (nace4Match) {
    const groupCode = nace4Match[1];
    if (SERIES_BY_ALIAS.has(groupCode)) {
      return SERIES_BY_ALIAS.get(groupCode) ?? null;
    }
    const twoDigit = groupCode.slice(0, 2);
    if (SERIES_BY_ALIAS.has(twoDigit)) {
      return SERIES_BY_ALIAS.get(twoDigit) ?? null;
    }
  }
  const naceMatch = cleaned.match(/\b(08\.1|16\.1|19|20\.3|22\.2|23\.[134567]|24\.[12]|25\.[12]|27\.[134]|28\.[12])\b/);
  if (naceMatch) {
    return SERIES_BY_ALIAS.get(naceMatch[1]) ?? null;
  }
  return null;
}

export interface BuildTuikSdmxUrlInput {
  dataflowId: string;
  agencyId?: string;
  version?: string;
  key?: string;
  startPeriod?: string;
  endPeriod?: string;
  format?: 'sdmx-json' | 'sdmx-csv';
}

export function buildTuikSdmxDataUrl(input: BuildTuikSdmxUrlInput): string {
  const agency = (input.agencyId || 'TUIK').trim();
  const dataflow = input.dataflowId.trim();
  const version = (input.version || '1.0').trim();
  const key = (input.key || 'all').trim();
  if (!/^[A-Za-z0-9_.-]+$/.test(agency) || !/^[A-Za-z0-9_.-]+$/.test(dataflow) || !/^[A-Za-z0-9_.-]+$/.test(version) || !/^[A-Za-z0-9_.+-]+$/.test(key)) {
    throw new Error('TUIK_SDMX_INVALID_IDENTIFIER');
  }
  const url = new URL(`${TUIK_SDMX_REST_BASE_URL}/data/${agency},${dataflow},${version}/${key}`);
  if (input.startPeriod?.trim()) url.searchParams.set('startPeriod', input.startPeriod.trim());
  if (input.endPeriod?.trim()) url.searchParams.set('endPeriod', input.endPeriod.trim());
  if (input.format) url.searchParams.set('format', input.format);
  return url.toString();
}

export interface ParsedTuikSdmxResult {
  format: 'sdmx-json' | 'sdmx-csv';
  rows: ParsedPriceRow[];
  periods: string[];
  latestPeriod: string;
  documentHash: string;
  versionHash: string;
  matchedSeriesCount: number;
}

function normalizePeriod(raw: string): string {
  const clean = raw.trim();
  // Convert SDMX monthly "2026-M03" or "2026M03" to "2026-03"
  const mMatch = clean.match(/^(\d{4})-?M(\d{2})$/i);
  if (mMatch) return `${mMatch[1]}-${mMatch[2]}`;
  return clean;
}

function formatIndexValue(val: unknown): string | null {
  if (typeof val === 'number') {
    return Number.isFinite(val) && val > 0 ? val.toFixed(2) : null;
  }
  if (typeof val === 'string') {
    const clean = val.trim().replace(/\s/g, '');
    if (!clean) return null;
    const normalized =
      clean.includes('.') && clean.includes(',')
        ? clean.lastIndexOf(',') > clean.lastIndexOf('.')
          ? clean.replace(/\./g, '').replace(',', '.')
          : clean.replace(/,/g, '')
        : clean.includes(',')
        ? clean.replace(',', '.')
        : clean;
    const num = Number(normalized);
    return Number.isFinite(num) && num > 0 ? num.toFixed(2) : null;
  }
  return null;
}

/**
 * Parses SDMX-JSON 1.0 / 2.0 payloads returned by `nsiws.tuik.gov.tr/rest/data/...`
 * (`Accept: application/vnd.sdmx.data+json;version=1.0.0`).
 */
export function parseTuikSdmxJson(payload: unknown, targetPeriod?: string): ParsedTuikSdmxResult {
  let parsedPayload = payload;
  if (typeof payload === 'string') {
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      throw new Error('Geçersiz TÜİK SDMX-JSON verisi.');
    }
  }
  if (!parsedPayload || typeof parsedPayload !== 'object') {
    throw new Error('Geçersiz TÜİK SDMX-JSON verisi.');
  }
  const root = (parsedPayload as Record<string, any>).data && typeof (parsedPayload as Record<string, any>).data === 'object'
    ? (parsedPayload as Record<string, any>).data
    : (parsedPayload as Record<string, any>);
  const structure = (parsedPayload as Record<string, any>).structure || root.structure || {};
  const dataSets = Array.isArray(root.dataSets) ? root.dataSets : [];
  if (dataSets.length === 0) {
    throw new Error('TÜİK SDMX-JSON içerisinde dataSets bulunamadı.');
  }

  const seriesDims: Array<{ id?: string; values?: Array<{ id?: string; name?: string }> }> =
    Array.isArray(structure?.dimensions?.series) ? structure.dimensions.series : [];
  const obsDims: Array<{ id?: string; values?: Array<{ id?: string; name?: string }> }> =
    Array.isArray(structure?.dimensions?.observation) ? structure.dimensions.observation : [];
  const timeDim = obsDims.find((d) => d.id === 'TIME_PERIOD' || d.id === 'TIME') ?? obsDims[0];
  const timeValues = Array.isArray(timeDim?.values) ? timeDim!.values : [];

  const latestByCode = new Map<string, { row: ParsedPriceRow; period: string }>();
  const periodsSet = new Set<string>();
  const normalizedTarget = targetPeriod ? normalizePeriod(targetPeriod) : undefined;

  const seriesObj = dataSets[0]?.series;
  if (seriesObj && typeof seriesObj === 'object') {
    for (const [seriesKey, seriesVal] of Object.entries(seriesObj as Record<string, any>)) {
      const dimIndices = seriesKey.split(':').map((part) => Number.parseInt(part, 10));
      let matchedSpec: TuikSdmxSeriesSpec | null = null;

      for (let i = 0; i < dimIndices.length; i++) {
        const dim = seriesDims[i];
        const valObj = dim?.values?.[dimIndices[i]] ?? dim?.values?.[0];
        const candidateId = valObj?.id ? String(valObj.id) : '';
        const candidateName = valObj?.name ? String(valObj.name) : '';
        matchedSpec = resolveTuikSeriesSpec(candidateId) || resolveTuikSeriesSpec(candidateName);
        if (matchedSpec) break;
      }

      if (!matchedSpec && seriesDims.length === 1) {
        const fallbackIdx = dimIndices[dimIndices.length - 1] ?? 0;
        const valObj = seriesDims[0]?.values?.[fallbackIdx];
        if (valObj) {
          matchedSpec =
            resolveTuikSeriesSpec(String(valObj.id || '')) ||
            resolveTuikSeriesSpec(String(valObj.name || ''));
        }
      }

      if (!matchedSpec) continue;

      const observations = seriesVal?.observations;
      if (!observations || typeof observations !== 'object') continue;

      for (const [obsKey, obsArr] of Object.entries(observations as Record<string, any>)) {
        const obsIdx = Number.parseInt(obsKey, 10);
        const rawPeriod = timeValues[obsIdx]?.id || timeValues[obsIdx]?.name || obsKey;
        const period = normalizePeriod(String(rawPeriod));
        if (normalizedTarget && period !== normalizedTarget) continue;

        const rawVal = Array.isArray(obsArr) ? obsArr[0] : obsArr;
        const price = formatIndexValue(rawVal);
        if (!price) continue;

        periodsSet.add(period);
        const prev = latestByCode.get(matchedSpec.itemCode);
        if (!prev || period.localeCompare(prev.period) >= 0) {
          latestByCode.set(matchedSpec.itemCode, {
            period,
            row: {
              itemCode: matchedSpec.itemCode,
              itemName: `${matchedSpec.itemName} [Dönem: ${period}]`,
              unit: 'endeks',
              price,
            },
          });
        }
      }
    }
  }

  if (latestByCode.size === 0) {
    throw new Error('TÜİK SDMX-JSON verisinde eşleşen İnşaat Maliyet / Yİ-ÜFE / TÜFE endeks gözlemi bulunamadı.');
  }

  const entries = [...latestByCode.values()].sort((a, b) => a.row.itemCode.localeCompare(b.row.itemCode));
  const rows = entries.map((e) => e.row);
  const periods = [...periodsSet].sort();
  const latestPeriod = entries.reduce((max, e) => (e.period.localeCompare(max) > 0 ? e.period : max), entries[0].period);
  const canonicalJson = JSON.stringify(rows);
  const documentHash = createHash('sha256').update(canonicalJson).digest('hex');
  const versionHash = createHash('sha256').update(`tuik-sdmx-v1:${latestPeriod}:${documentHash}`).digest('hex');

  return {
    format: 'sdmx-json',
    rows,
    periods,
    latestPeriod,
    documentHash,
    versionHash,
    matchedSeriesCount: rows.length,
  };
}

function splitCsvRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses SDMX-CSV (`DATAFLOW,NACE_REV2,TIME_PERIOD,OBS_VALUE` or `code,period,value`)
 * exported from `veriportali.tuik.gov.tr` or `nsiws.tuik.gov.tr`.
 */
export function parseTuikSdmxCsv(csvText: string, targetPeriod?: string): ParsedTuikSdmxResult {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('TÜİK SDMX-CSV en az 1 başlık ve 1 veri satırı içermelidir.');
  }

  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const headers = splitCsvRow(lines[0], delimiter).map((h) => h.replace(/^"|"$/g, '').toUpperCase());

  const valIdx = headers.findIndex((h) => ['OBS_VALUE', 'VALUE', 'PRICE', 'ENDEKS', 'DEGER'].includes(h));
  const timeIdx = headers.findIndex((h) => ['TIME_PERIOD', 'PERIOD', 'DONEM', 'TIME'].includes(h));
  const codeIndices = headers
    .map((h, idx) =>
      ['ITEMCODE', 'ITEM_CODE', 'NACE_REV2', 'NACE', 'INDICATOR', 'IND_CODE', 'SERI_KODU', 'CODE', 'KOD'].includes(h)
        ? idx
        : -1
    )
    .filter((idx) => idx >= 0);

  if (valIdx < 0 || codeIndices.length === 0) {
    throw new Error('TÜİK SDMX-CSV başlıklarında OBS_VALUE/price ve NACE_REV2/itemCode sütunları bulunamadı.');
  }

  const normalizedTarget = targetPeriod ? normalizePeriod(targetPeriod) : undefined;
  const latestByCode = new Map<string, { row: ParsedPriceRow; period: string }>();
  const periodsSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i], delimiter).map((c) => c.replace(/^"|"$/g, ''));
    if (cols.length <= valIdx) continue;

    let matchedSpec: TuikSdmxSeriesSpec | null = null;
    for (const cIdx of codeIndices) {
      if (cols[cIdx]) {
        matchedSpec = resolveTuikSeriesSpec(cols[cIdx]);
        if (matchedSpec) break;
      }
    }
    if (!matchedSpec) continue;

    const rawPeriod = timeIdx >= 0 && cols[timeIdx] ? cols[timeIdx] : '2026-01';
    const period = normalizePeriod(rawPeriod);
    if (normalizedTarget && period !== normalizedTarget) continue;

    const price = formatIndexValue(cols[valIdx]);
    if (!price) continue;

    periodsSet.add(period);
    const prev = latestByCode.get(matchedSpec.itemCode);
    if (!prev || period.localeCompare(prev.period) >= 0) {
      latestByCode.set(matchedSpec.itemCode, {
        period,
        row: {
          itemCode: matchedSpec.itemCode,
          itemName: `${matchedSpec.itemName} [Dönem: ${period}]`,
          unit: 'endeks',
          price,
        },
      });
    }
  }

  if (latestByCode.size === 0) {
    throw new Error('TÜİK SDMX-CSV verisinde eşleşen endeks satırı bulunamadı.');
  }

  const entries = [...latestByCode.values()].sort((a, b) => a.row.itemCode.localeCompare(b.row.itemCode));
  const rows = entries.map((e) => e.row);
  const periods = [...periodsSet].sort();
  const latestPeriod = entries.reduce((max, e) => (e.period.localeCompare(max) > 0 ? e.period : max), entries[0].period);
  const canonicalJson = JSON.stringify(rows);
  const documentHash = createHash('sha256').update(canonicalJson).digest('hex');
  const versionHash = createHash('sha256').update(`tuik-sdmx-v1:${latestPeriod}:${documentHash}`).digest('hex');

  return {
    format: 'sdmx-csv',
    rows,
    periods,
    latestPeriod,
    documentHash,
    versionHash,
    matchedSeriesCount: rows.length,
  };
}

export function validateTuikPortalHost(rawUrl: string): URL {
  const parsed = validateCrawlerUrl(rawUrl);
  const host = parsed.hostname.toLowerCase();
  if (host !== 'tuik.gov.tr' && !host.endsWith('.tuik.gov.tr')) {
    throw new Error('TUIK_SDMX_HOST_BLOCKED');
  }
  return parsed;
}

export async function validateTuikPortalHostDns(rawUrl: string): Promise<URL> {
  const parsed = validateTuikPortalHost(rawUrl);
  await checkedDnsLookup(parsed.hostname.toLowerCase());
  return parsed;
}

export function getTuikSdmxIntegrationMetadata() {
  return {
    provider: 'Türkiye İstatistik Kurumu (TÜİK) Veri Portalı',
    standard: 'SDMX 2.1 (ISO 17369)',
    documentationUrl: TUIK_SDMX_DOC_URL,
    restBaseUrl: TUIK_SDMX_REST_BASE_URL,
    tokenEndpoint: TUIK_OIDC_TOKEN_URL,
    hasConfiguredToken: Boolean(process.env.TUIK_SDMX_BEARER_TOKEN),
    supportedFormats: [
      'application/vnd.sdmx.data+json;version=1.0.0',
      'application/vnd.sdmx.data+csv;version=1.0.0',
    ],
    supportedDataflows: [
      {
        id: 'DF_IME',
        title: 'İnşaat Maliyet Endeksi (İME — Genel, Malzeme, İşçilik, Bina)',
        frequency: 'Aylık (Her ayın ~10. günü saat 10:00)',
      },
      {
        id: 'DF_YI_UFE',
        title: 'Yurt İçi Üretici Fiyat Endeksi (Yİ-ÜFE — 20 NACE Rev.2 Alt Sektörü / 4735 Pn)',
        frequency: 'Aylık (Her ayın 3. günü saat 10:00)',
      },
      {
        id: 'DF_TUFE',
        title: 'Tüketici Fiyat Endeksi (TÜFE 2023=100 — İşçilik Rayiç Eskalasyonu)',
        frequency: 'Aylık (Her ayın 3. günü saat 10:00)',
      },
    ],
    seriesCount: TUIK_SDMX_SERIES_CATALOG.length,
    totalMappedSeries: TUIK_SDMX_SERIES_CATALOG.length,
    seriesCatalog: TUIK_SDMX_SERIES_CATALOG,
  };
}
