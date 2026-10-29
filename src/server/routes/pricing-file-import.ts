import { createHash } from 'node:crypto';
import express, { type Express } from 'express';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { adminAuditLogs, priceFeedStaging, pricingDataSources } from '../../db/schema';
import { authenticate, checkSuperAdmin, requireVerifiedEmail } from '../middleware/auth';
import { consumeRateLimit } from '../auth/security';
import { parseLicensedPriceCsv } from '../crawler/licensed-csv';
import {
  getOfficialCatalogCoverageReport,
  getOfficialCsbCatalogById,
  listOfficialCsbCatalogs,
  parseCsbPdfDocument,
  type ParsedPriceRow,
} from '../crawler/csb-pdf-parser';
import {
  buildTuikSdmxDataUrl,
  getTuikSdmxIntegrationMetadata,
  parseTuikSdmxCsv,
  parseTuikSdmxJson,
  validateTuikPortalHost,
} from '../crawler/tuik-sdmx-adapter';

interface CatalogImportPayload {
  kind: 'licensed-csv-v1' | 'licensed-pdf-v1' | 'official-csb-catalog-v1' | 'tuik-sdmx-v1';
  versionPrefix: 'csv' | 'pdf' | 'csb-pdf' | 'tuik-sdmx';
  fileName: string;
  licenseReference: string;
  validityStart: string;
  validityEnd: string;
  documentHash: string;
  versionHash: string;
  autoApprove: boolean;
  rows: ParsedPriceRow[];
  userId: string;
  sourceId: string;
  auditAction: string;
}

async function executeCatalogImport(payload: CatalogImportPayload) {
  return db.transaction(async (tx) => {
    const [parent] = await tx
      .select()
      .from(pricingDataSources)
      .where(eq(pricingDataSources.id, payload.sourceId))
      .for('update');
    if (!parent) return null;

    const versionTag = `${payload.versionPrefix}:${payload.versionHash}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${parent.id}:${versionTag}`}, 0))`);

    const now = new Date();

    if (parent.dataHash === payload.documentHash && parent.versionTag === versionTag && parent.status === 'active') {
      return {
        sourceId: parent.id,
        insertedCount: 0,
        autoApprovedCount: 0,
        documentHash: payload.documentHash,
        reused: true,
      };
    }

    const prevConfig =
      parent.crawlerConfig && typeof parent.crawlerConfig === 'object'
        ? (parent.crawlerConfig as Record<string, unknown>)
        : {};
    const metadata = {
      ...prevConfig,
      kind: payload.kind,
      parentSourceId: parent.id,
      documentHash: payload.documentHash,
      fileName: payload.fileName,
      licenseReference: payload.licenseReference,
      importedAt: now.toISOString(),
      autoApprove: payload.autoApprove,
    };

    const existingApproved = await tx
      .select()
      .from(priceFeedStaging)
      .where(and(eq(priceFeedStaging.sourceId, parent.id), eq(priceFeedStaging.status, 'approved')));
    const approvedByCode = new Map<string, (typeof existingApproved)[number]>();
    for (const row of existingApproved) {
      if (!approvedByCode.has(row.itemCode)) {
        approvedByCode.set(row.itemCode, row);
      }
    }

    await tx
      .delete(priceFeedStaging)
      .where(and(eq(priceFeedStaging.sourceId, parent.id), eq(priceFeedStaging.status, 'pending')));

    if (payload.autoApprove && existingApproved.length > 0) {
      const importedCodes = payload.rows.map((r) => r.itemCode);
      await tx
        .update(priceFeedStaging)
        .set({
          status: 'rejected',
          notes: sql`COALESCE(${priceFeedStaging.notes}, '') || ' | Yeni resmi katalog sürümü ile güncellendi'`,
        })
        .where(
          and(
            eq(priceFeedStaging.sourceId, parent.id),
            eq(priceFeedStaging.status, 'approved'),
            inArray(priceFeedStaging.itemCode, importedCodes)
          )
        );
    }

    await tx
      .update(pricingDataSources)
      .set({
        status: 'active',
        itemCount: payload.rows.length,
        validityStart: new Date(payload.validityStart),
        validityEnd: new Date(`${payload.validityEnd}T23:59:59.999Z`),
        versionTag,
        dataHash: payload.documentHash,
        crawlerConfig: metadata,
        lastSyncAt: now,
        updatedAt: now,
      })
      .where(eq(pricingDataSources.id, parent.id));

    await tx.insert(priceFeedStaging).values(
      payload.rows.map((row, index) => {
        const prev = approvedByCode.get(row.itemCode);
        const prevPrice = prev ? Number(prev.crawledPrice) : null;
        const newPrice = Number(row.price);
        const diffPercent =
          prevPrice !== null && Number.isFinite(prevPrice) && prevPrice > 0
            ? String(Math.round(((newPrice - prevPrice) / prevPrice) * 10000) / 100)
            : null;
        return {
          sourceId: parent.id,
          itemCode: row.itemCode,
          itemName: row.itemName,
          unit: row.unit,
          currentPrice: prevPrice !== null && Number.isFinite(prevPrice) ? prevPrice.toFixed(2) : null,
          crawledPrice: row.price,
          diffPercent,
          status: payload.autoApprove ? 'approved' : 'pending',
          reviewedAt: payload.autoApprove ? now : null,
          reviewedByUserId: payload.autoApprove ? payload.userId : null,
          confidenceScore: '1.00',
          sourceUrl: parent.sourceUrl,
          notes: `[${payload.kind}] ` + JSON.stringify({ ...metadata, row: index + 1 }),
          crawledAt: now,
        };
      })
    );

    await tx.insert(adminAuditLogs).values({
      adminId: payload.userId,
      action: payload.auditAction,
      details: {
        ...metadata,
        sourceId: parent.id,
        rowCount: payload.rows.length,
        autoApprove: payload.autoApprove,
      },
    });

    return {
      sourceId: parent.id,
      insertedCount: payload.rows.length,
      autoApprovedCount: payload.autoApprove ? payload.rows.length : 0,
      documentHash: payload.documentHash,
      reused: false,
    };
  });
}

export function registerPricingFileImportRoutes(app: Express) {
  // List official 2026 ÇŞB PDF catalogs available from docs/fiyatlandirma-kaynaklari
  app.get(
    '/api/admin/pricing-sources/official-catalogs',
    authenticate,
    checkSuperAdmin(),
    requireVerifiedEmail,
    (_req, res) => {
      return res.json({
        catalogs: listOfficialCsbCatalogs(),
        coverageReport: getOfficialCatalogCoverageReport(),
      });
    }
  );

  // Import licensed CSV
  app.post(
    '/api/admin/pricing-sources/:id/import-csv',
    authenticate,
    checkSuperAdmin(),
    requireVerifiedEmail,
    async (req, res) => {
      if (!z.string().uuid().safeParse(req.params.id).success) {
        return res.status(400).json({ error: 'Kaynak kimliği geçersiz.' });
      }
      let parsed: ReturnType<typeof parseLicensedPriceCsv>;
      try {
        parsed = parseLicensedPriceCsv(req.body);
      } catch {
        return res.status(400).json({
          error:
            'CSV, kullanım izni ve geçerlilik alanlarını kontrol edin. En fazla 500 KB / 500 satır; başlıklar: itemCode,itemName,unit,price. Fiyat ondalığı nokta olmalı.',
        });
      }
      try {
        const limit = await consumeRateLimit(`pricing-file:${req.user.userId}`, 10, 60_000);
        if (!limit.allowed) return res.status(429).json({ error: 'Dosya içe aktarma limiti doldu.' });

        const result = await executeCatalogImport({
          kind: 'licensed-csv-v1',
          versionPrefix: 'csv',
          fileName: parsed.fileName,
          licenseReference: parsed.licenseReference,
          validityStart: parsed.validityStart,
          validityEnd: parsed.validityEnd,
          documentHash: parsed.documentHash,
          versionHash: parsed.versionHash,
          autoApprove: Boolean(parsed.autoApprove),
          rows: parsed.rows as ParsedPriceRow[],
          userId: req.user.userId,
          sourceId: req.params.id,
          auditAction: 'pricing_csv_imported',
        });

        if (!result) return res.status(404).json({ error: 'Kaynak bulunamadı.' });
        return res.status(result.reused ? 200 : 201).json(result);
      } catch (err) {
        console.error('CSV import error:', err);
        return res
          .status(503)
          .json({ error: 'Dosya içe aktarılamadı. Kayıtlar kısmen kaydedilmedi; tekrar deneyin.' });
      }
    }
  );

  // Import official ÇŞB PDF directly from uploaded file (SEC-2: 50MB parser runs only after SuperAdmin auth)
  app.post(
    '/api/admin/pricing-sources/:id/import-pdf',
    authenticate,
    checkSuperAdmin(),
    requireVerifiedEmail,
    express.json({ limit: '50mb' }),
    async (req, res) => {
      if (!z.string().uuid().safeParse(req.params.id).success) {
        return res.status(400).json({ error: 'Kaynak kimliği geçersiz.' });
      }
      let parsed: ReturnType<typeof parseCsbPdfDocument>;
      try {
        parsed = parseCsbPdfDocument(req.body);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'PDF ayrıştırılamadı.';
        return res.status(400).json({ error: msg });
      }
      try {
        const limit = await consumeRateLimit(`pricing-file:${req.user.userId}`, 10, 60_000);
        if (!limit.allowed) return res.status(429).json({ error: 'Dosya içe aktarma limiti doldu.' });

        const result = await executeCatalogImport({
          kind: 'licensed-pdf-v1',
          versionPrefix: 'pdf',
          fileName: parsed.fileName,
          licenseReference: parsed.licenseReference,
          validityStart: parsed.validityStart,
          validityEnd: parsed.validityEnd,
          documentHash: parsed.documentHash,
          versionHash: parsed.versionHash,
          autoApprove: parsed.autoApprove !== false,
          rows: parsed.rows,
          userId: req.user.userId,
          sourceId: req.params.id,
          auditAction: 'pricing_pdf_imported',
        });

        if (!result) return res.status(404).json({ error: 'Kaynak bulunamadı.' });
        return res.status(result.reused ? 200 : 201).json(result);
      } catch (err) {
        console.error('PDF import error:', err);
        return res
          .status(503)
          .json({ error: 'PDF içe aktarılamadı. Kayıtlar kısmen kaydedilmedi; tekrar deneyin.' });
      }
    }
  );

  // 1-Click Import from pre-indexed official 2026 ÇŞB PDF catalog (docs/fiyatlandirma-kaynaklari)
  const officialCatalogReqSchema = z.object({
    catalogId: z.string().trim().min(1).max(100),
    licenseConfirmed: z.literal(true),
    licenseReference: z.string().trim().min(5).max(1000).optional(),
    validityStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    validityEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    autoApprove: z.boolean().optional(),
  });

  app.post(
    '/api/admin/pricing-sources/:id/import-official-catalog',
    authenticate,
    checkSuperAdmin(),
    requireVerifiedEmail,
    async (req, res) => {
      if (!z.string().uuid().safeParse(req.params.id).success) {
        return res.status(400).json({ error: 'Kaynak kimliği geçersiz.' });
      }
      const parsedReq = officialCatalogReqSchema.safeParse(req.body);
      if (!parsedReq.success) {
        return res.status(400).json({ error: 'Resmi katalog seçimi ve lisans onayı gereklidir.' });
      }
      const catalog = getOfficialCsbCatalogById(parsedReq.data.catalogId);
      if (!catalog) {
        return res.status(404).json({ error: 'Seçilen resmi ÇŞB PDF kataloğu bulunamadı.' });
      }
      try {
        const limit = await consumeRateLimit(`pricing-file:${req.user.userId}`, 10, 60_000);
        if (!limit.allowed) return res.status(429).json({ error: 'Dosya içe aktarma limiti doldu.' });

        const validityStart = parsedReq.data.validityStart || catalog.validityStart;
        const validityEnd = parsedReq.data.validityEnd || catalog.validityEnd;
        const licenseReference = parsedReq.data.licenseReference || catalog.licenseReference;
        const versionHash = createHash('sha256')
          .update(
            JSON.stringify({
              documentHash: catalog.documentHash,
              licenseReference,
              validityStart,
              validityEnd,
            })
          )
          .digest('hex');

        const result = await executeCatalogImport({
          kind: 'official-csb-catalog-v1',
          versionPrefix: 'csb-pdf',
          fileName: catalog.fileName,
          licenseReference,
          validityStart,
          validityEnd,
          documentHash: catalog.documentHash,
          versionHash,
          autoApprove: parsedReq.data.autoApprove !== false,
          rows: catalog.rows,
          userId: req.user.userId,
          sourceId: req.params.id,
          auditAction: 'pricing_official_catalog_imported',
        });

        if (!result) return res.status(404).json({ error: 'Kaynak bulunamadı.' });
        return res.status(result.reused ? 200 : 201).json({
          ...result,
          catalogTitle: catalog.title,
          totalMatchedInPdf: catalog.totalMatchedInPdf,
        });
      } catch (err) {
        console.error('Official catalog import error:', err);
        return res.status(503).json({ error: 'Resmi katalog içe aktarılamadı.' });
      }
    }
  );

  // TÜİK SDMX 2.1 Web Service Integration Metadata & Series Catalog
  app.get(
    '/api/admin/pricing-sources/tuik-sdmx/metadata',
    authenticate,
    checkSuperAdmin(),
    requireVerifiedEmail,
    (_req, res) => {
      return res.json(getTuikSdmxIntegrationMetadata());
    }
  );

  const tuikSdmxSyncReqSchema = z.object({
    mode: z.enum(['sdmx_json', 'sdmx_csv', 'live_nsiws', 'baseline_2026_catalog']),
    sdmxPayload: z.string().trim().max(5_000_000).optional(),
    bearerToken: z.string().trim().min(10).max(4096).optional(),
    dataflowId: z.enum(['DF_IME', 'DF_YI_UFE', 'DF_TUFE']).optional(),
    startPeriod: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    endPeriod: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    validityStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    validityEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    licenseConfirmed: z.literal(true),
    licenseReference: z.string().trim().min(5).max(1000).optional(),
    autoApprove: z.boolean().optional(),
  });

  app.post(
    '/api/admin/pricing-sources/:id/sync-tuik-sdmx',
    authenticate,
    checkSuperAdmin(),
    requireVerifiedEmail,
    async (req, res) => {
      if (!z.string().uuid().safeParse(req.params.id).success) {
        return res.status(400).json({ error: 'Kaynak kimliği geçersiz.' });
      }
      const parsedReq = tuikSdmxSyncReqSchema.safeParse(req.body);
      if (!parsedReq.success) {
        return res.status(400).json({ error: 'TÜİK SDMX parametreleri ve lisans onayı kontrol edilmelidir.' });
      }
      try {
        const limit = await consumeRateLimit(`pricing-file:${req.user.userId}`, 10, 60_000);
        if (!limit.allowed) return res.status(429).json({ error: 'TÜİK SDMX senkronizasyon limiti doldu.' });

        const data = parsedReq.data;
        let rows: ParsedPriceRow[] = [];
        let documentHash = '';
        let fileName = 'tuik-sdmx-2.1-sync.json';
        let licenseReference =
          data.licenseReference ||
          'TÜİK Veri Portalı SDMX 2.1 Web Servisi — 4734 S.K. Fiyat Farkı & İnşaat Maliyet Endeksi';
        let validityStart = data.validityStart || '2026-01-01';
        let validityEnd = data.validityEnd || '2026-12-31';

        if (data.mode === 'baseline_2026_catalog') {
          const catalog = getOfficialCsbCatalogById('csb_2026_tuik_endeks_eslestirme');
          if (!catalog) {
            return res.status(404).json({ error: 'TÜİK-ÇŞB 2026 baz endeks kataloğu bulunamadı.' });
          }
          rows = catalog.rows;
          documentHash = catalog.documentHash;
          fileName = catalog.fileName;
          licenseReference = data.licenseReference || catalog.licenseReference;
          validityStart = data.validityStart || catalog.validityStart;
          validityEnd = data.validityEnd || catalog.validityEnd;
        } else if (data.mode === 'sdmx_json') {
          if (!data.sdmxPayload) {
            return res.status(400).json({ error: 'SDMX-JSON verisi boş olamaz.' });
          }
          const parsedSdmx = parseTuikSdmxJson(data.sdmxPayload);
          if (parsedSdmx.rows.length === 0) {
            return res.status(400).json({ error: 'SDMX-JSON içinden geçerli TÜİK endeks serisi çıkarılamadı.' });
          }
          rows = parsedSdmx.rows;
          documentHash = parsedSdmx.documentHash;
          fileName = `tuik-sdmx-${parsedSdmx.periods[parsedSdmx.periods.length - 1] || '2026'}.json`;
        } else if (data.mode === 'sdmx_csv') {
          if (!data.sdmxPayload) {
            return res.status(400).json({ error: 'SDMX-CSV verisi boş olamaz.' });
          }
          const parsedSdmx = parseTuikSdmxCsv(data.sdmxPayload);
          if (parsedSdmx.rows.length === 0) {
            return res.status(400).json({ error: 'SDMX-CSV içinden geçerli TÜİK endeks serisi çıkarılamadı.' });
          }
          rows = parsedSdmx.rows;
          documentHash = parsedSdmx.documentHash;
          fileName = `tuik-sdmx-${parsedSdmx.periods[parsedSdmx.periods.length - 1] || '2026'}.csv`;
        } else if (data.mode === 'live_nsiws') {
          if (!data.bearerToken) {
            return res.status(400).json({
              error:
                'TÜİK NSIWS canlı SDMX sorgusu için TÜİK Veri Portalı OAuth2 Bearer Token gereklidir (https://veriportali.tuik.gov.tr/tr/sdmx-web-service-documentation). Token olmadan SDMX-JSON / SDMX-CSV veya 2026 Baz Endeks Kataloğu modunu kullanabilirsiniz.',
            });
          }
          const queryUrl = buildTuikSdmxDataUrl({
            dataflowId: data.dataflowId || 'DF_YI_UFE',
            startPeriod: data.startPeriod || '2026-01',
            endPeriod: data.endPeriod,
            format: 'sdmx-json',
          });
          validateTuikPortalHost(queryUrl);
          const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${data.bearerToken}`,
              Accept: 'application/vnd.sdmx.data+json;version=1.0.0-wd, application/json',
              'User-Agent': 'TeklifPro-TUIK-SDMX-Client/2.1 (+https://bimmetraj.com)',
            },
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) {
            return res.status(502).json({
              error: `TÜİK NSIWS SDMX servisi HTTP ${response.status} döndürdü. Bearer Token yetkisini veya veri akışı kodunu kontrol edin.`,
            });
          }
          const rawJson = await response.text();
          const parsedSdmx = parseTuikSdmxJson(rawJson);
          if (parsedSdmx.rows.length === 0) {
            return res.status(400).json({ error: 'TÜİK NSIWS yanıtından geçerli endeks gözlemi çıkarılamadı.' });
          }
          rows = parsedSdmx.rows;
          documentHash = parsedSdmx.documentHash;
          fileName = `tuik-nsiws-${data.dataflowId || 'DF_YI_UFE'}.json`;
        }

        const versionHash = createHash('sha256')
          .update(
            JSON.stringify({
              documentHash,
              licenseReference,
              validityStart,
              validityEnd,
              mode: data.mode,
            })
          )
          .digest('hex');

        const result = await executeCatalogImport({
          kind: 'tuik-sdmx-v1',
          versionPrefix: 'tuik-sdmx',
          fileName,
          licenseReference,
          validityStart,
          validityEnd,
          documentHash,
          versionHash,
          autoApprove: data.autoApprove !== false,
          rows,
          userId: req.user.userId,
          sourceId: req.params.id,
          auditAction: 'pricing_tuik_sdmx_synced',
        });

        if (!result) return res.status(404).json({ error: 'Kaynak bulunamadı.' });
        return res.status(result.reused ? 200 : 201).json({
          ...result,
          mode: data.mode,
          rowCount: rows.length,
        });
      } catch (err) {
        console.error('TUIK SDMX sync error:', err);
        return res.status(503).json({
          error: err instanceof Error ? err.message : 'TÜİK SDMX verisi senkronize edilemedi.',
        });
      }
    }
  );
}
