import type { Express } from 'express';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { adminAuditLogs, priceFeedStaging, pricingDataSources } from '../../db/schema';
import { authenticate, checkSuperAdmin, requireVerifiedEmail } from '../middleware/auth';
import { consumeRateLimit } from '../auth/security';
import { parseLicensedPriceCsv } from '../crawler/licensed-csv';

export function registerPricingFileImportRoutes(app: Express) {
  app.post('/api/admin/pricing-sources/:id/import-csv', authenticate, checkSuperAdmin(), requireVerifiedEmail, async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.id).success) {
      return res.status(400).json({ error: 'Kaynak kimliği geçersiz.' });
    }
    let parsed: ReturnType<typeof parseLicensedPriceCsv>;
    try {
      parsed = parseLicensedPriceCsv(req.body);
    } catch {
      return res.status(400).json({
        error: 'CSV, kullanım izni ve geçerlilik alanlarını kontrol edin. En fazla 500 KB / 500 satır; başlıklar: itemCode,itemName,unit,price. Fiyat ondalığı nokta olmalı.',
      });
    }
    try {
      const limit = await consumeRateLimit(`pricing-file:${req.user.userId}`, 10, 60_000);
      if (!limit.allowed) return res.status(429).json({ error: 'Dosya içe aktarma limiti doldu.' });

      const result = await db.transaction(async (tx) => {
        const [parent] = await tx.select().from(pricingDataSources).where(eq(pricingDataSources.id, req.params.id)).for('update');
        if (!parent) return null;

        const versionTag = `csv:${parsed.versionHash}`;
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${parent.id}:${versionTag}`}, 0))`);

        if (parent.dataHash === parsed.documentHash && parent.versionTag === versionTag && parent.status === 'active') {
          return { sourceId: parent.id, insertedCount: 0, autoApprovedCount: 0, reused: true };
        }

        const now = new Date();
        const autoApprove = Boolean(parsed.autoApprove);
        const prevConfig = parent.crawlerConfig && typeof parent.crawlerConfig === 'object'
          ? (parent.crawlerConfig as Record<string, unknown>)
          : {};
        const metadata = {
          ...prevConfig,
          kind: 'licensed-csv-v1',
          parentSourceId: parent.id,
          documentHash: parsed.documentHash,
          fileName: parsed.fileName,
          licenseReference: parsed.licenseReference,
          licenseConfirmedBy: req.user.userId,
          importedAt: now.toISOString(),
          autoApprove,
        };

        // Fetch existing approved items to compute deltas
        const existingApproved = await tx
          .select()
          .from(priceFeedStaging)
          .where(and(eq(priceFeedStaging.sourceId, parent.id), eq(priceFeedStaging.status, 'approved')));
        const approvedByCode = new Map<string, typeof existingApproved[number]>();
        for (const row of existingApproved) {
          if (!approvedByCode.has(row.itemCode)) {
            approvedByCode.set(row.itemCode, row);
          }
        }

        // Clear older pending items for this source
        await tx
          .delete(priceFeedStaging)
          .where(and(eq(priceFeedStaging.sourceId, parent.id), eq(priceFeedStaging.status, 'pending')));

        if (autoApprove && existingApproved.length > 0) {
          const importedCodes = parsed.rows.map((r) => r.itemCode);
          await tx
            .update(priceFeedStaging)
            .set({ status: 'rejected', notes: sql`COALESCE(${priceFeedStaging.notes}, '') || ' | Yeni CSV sürümü ile güncellendi'` })
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
            itemCount: parsed.rows.length,
            validityStart: new Date(parsed.validityStart),
            validityEnd: new Date(`${parsed.validityEnd}T23:59:59.999Z`),
            versionTag,
            dataHash: parsed.documentHash,
            crawlerConfig: metadata,
            lastSyncAt: now,
            updatedAt: now,
          })
          .where(eq(pricingDataSources.id, parent.id));

        await tx.insert(priceFeedStaging).values(
          parsed.rows.map((row, index) => {
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
              status: autoApprove ? 'approved' : 'pending',
              reviewedAt: autoApprove ? now : null,
              reviewedByUserId: autoApprove ? req.user.userId : null,
              confidenceScore: '100',
              sourceUrl: parent.sourceUrl,
              notes: '[licensed-csv-v1] ' + JSON.stringify({ ...metadata, row: index + 2 }),
              crawledAt: now,
            };
          })
        );

        await tx.insert(adminAuditLogs).values({
          adminId: req.user.userId,
          action: 'pricing_csv_imported',
          details: { ...metadata, sourceId: parent.id, rowCount: parsed.rows.length, autoApprove },
        });

        return {
          sourceId: parent.id,
          insertedCount: parsed.rows.length,
          autoApprovedCount: autoApprove ? parsed.rows.length : 0,
          reused: false,
        };
      });

      if (!result) return res.status(404).json({ error: 'Kaynak bulunamadı.' });
      return res.status(result.reused ? 200 : 201).json(result);
    } catch (err) {
      console.error('CSV import error:', err);
      return res.status(503).json({ error: 'Dosya içe aktarılamadı. Kayıtlar kısmen kaydedilmedi; tekrar deneyin.' });
    }
  });
}

