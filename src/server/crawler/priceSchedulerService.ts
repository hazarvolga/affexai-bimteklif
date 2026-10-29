import { crawlSourceIdentity, priceSourceIdentity, priceObservationMatchesSource } from "./source-identity";
import { assertCrawlSourceProof } from "./source-proof";
import { isDeepStrictEqual } from "node:util";
import { claimCrawlSource, releaseCrawlSource } from "./crawl-claim";
import { db, pool } from "../../db";
import { adminAuditLogs, priceFeedStaging, pricingDataSources, users } from "../../db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { acquireCrawlerScheduleLock } from "./scheduler-lock";
import { priceCrawlerService } from "./priceCrawlerService";
import { inferCrawledItemUnit } from "./price-parser";
import { CRAWLER_TIMEZONE, crawlerDayStart, crawlerScheduleDue, nextCrawlerRun } from "./scheduler-time";
import { isAutomaticPricingSource } from './source-eligibility';
import { logger } from "../logger";

export interface BatchRunSummary {
  startedAt: string;
  completedAt: string;
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  totalItemsStaged: number;
  durationMs: number;
  results: Array<{
    sourceCode: string;
    sourceName: string;
    status: "success" | "partial" | "error";
    itemsCount: number;
    durationMs: number;
    error?: string;
  }>;
}

interface SchedulerAudit {
  createdAt: Date;
  action: string;
  details: unknown;
}
async function latestSchedulerAudit(): Promise<SchedulerAudit | null> {
  const [record] = await db.select({ createdAt: adminAuditLogs.createdAt, action: adminAuditLogs.action, details: adminAuditLogs.details })
    .from(adminAuditLogs).where(inArray(adminAuditLogs.action, ['nightly_batch_crawl_completed', 'nightly_batch_crawl_failed']))
    .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id)).limit(1);
  return record ?? null;
}
function auditSummary(record: SchedulerAudit): BatchRunSummary {
  const details = record.details && typeof record.details === 'object' ? record.details as Record<string, unknown> : {};
  const count = (name: string) => typeof details[name] === 'number' && Number.isFinite(details[name]) ? details[name] as number : 0;
  return { startedAt: typeof details.startedAt === 'string' ? details.startedAt : record.createdAt.toISOString(),
    completedAt: typeof details.completedAt === 'string' ? details.completedAt : record.createdAt.toISOString(),
    totalSources: count('totalSources'), successfulSources: count('successfulSources'), failedSources: count('failedSources'),
    totalItemsStaged: count('totalItemsStaged'), durationMs: count('durationMs'), results: [] };
}

export class PriceSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isRunningBatch = false;
  constructor(private readonly readLatestAudit: () => Promise<SchedulerAudit | null> = latestSchedulerAudit) {}

  /** Next 03:00 Europe/Istanbul, independent of server or database timezone. */
  getNextScheduledRun(): Date {
    return nextCrawlerRun(new Date());
  }

  /**
   * Start scheduled check interval (runs every 10 minutes to verify if 03:00 window reached)
   */
  start(): void {
    if (this.timer) return;

    logger.info(
      `[PriceScheduler] Gece otomatik tarayıcı zamanlayıcısı başlatıldı. Bir sonraki tarama: ${this.getNextScheduledRun().toLocaleString("tr-TR", { timeZone: CRAWLER_TIMEZONE })}`
    );

    // Check every 10 minutes
    this.timer = setInterval(() => {
      this.checkAndExecuteSchedule().catch((err) => {
        console.error("[PriceScheduler] Zamanlanmış kontrol hatası:", err);
      });
    }, 10 * 60 * 1000);

    // Unref so it doesn't prevent graceful process exit
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("[PriceScheduler] Gece tarayıcı zamanlayıcısı durduruldu.");
    }
  }

  private async checkAndExecuteSchedule(): Promise<void> {
    const now = new Date();
    // Window: between 03:00 and 03:20 AM
    if (crawlerScheduleDue(now)) {
      logger.info("[PriceScheduler] 03:00 Gece otomatik sıralı tarama başlatılıyor...");
      await this.runSequentialBatch("system_nightly_cron");
    }
  }

  /**
   * Executes a gentle, sequential batch crawl across all active pricing sources.
   * Uses polite delay (2500ms) between sources to prevent CPU, network, or target site overload.
   */
  async runSequentialBatch(
    triggeredBy: string = "manual_admin",
    adminUserId?: string
  ): Promise<BatchRunSummary> {
    if (this.isRunningBatch) {
      throw new Error("Toplu tarama şu anda zaten arka planda çalışmaktadır.");
    }

    this.isRunningBatch = true;
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    const summary: BatchRunSummary = {
      startedAt,
      completedAt: "",
      totalSources: 0,
      successfulSources: 0,
      failedSources: 0,
      totalItemsStaged: 0,
      durationMs: 0,
      results: [],
    };

    let actorAdminId = adminUserId;
    let batchStarted = false;
    let releaseScheduleLock: (() => Promise<void>) | null = null;
    try {
      releaseScheduleLock = await acquireCrawlerScheduleLock(pool);
      if (!releaseScheduleLock) throw new Error("CRAWLER_BATCH_ALREADY_RUNNING");
      // A completed nightly batch survives API restarts and coordinates replicas.
      if (triggeredBy === "system_nightly_cron") {
        const [completed] = await db.select({ id: adminAuditLogs.id }).from(adminAuditLogs).where(and(
          eq(adminAuditLogs.action, "nightly_batch_crawl_completed"),
          sql`${adminAuditLogs.details}->>'triggeredBy' = 'system_nightly_cron'`,
          sql`${adminAuditLogs.createdAt} >= ${crawlerDayStart(new Date())}`,
        )).limit(1);
        if (completed) {
          return { ...summary, completedAt: new Date().toISOString() };
        }
      }
      // Resolve the durable audit actor before doing work; never run an unrecordable batch.
      if (!actorAdminId) {
        const [superAdmin] = await db.select({ id: users.id }).from(users).where(eq(users.isSuperAdmin, true)).limit(1);
        actorAdminId = superAdmin?.id;
      }
      if (!actorAdminId) throw new Error('CRAWLER_AUDIT_ACTOR_REQUIRED');
      batchStarted = true;
      // 1. Fetch active pricing sources
      const sources = await db
        .select()
        .from(pricingDataSources)
        .where(sql`${pricingDataSources.status} = 'active' OR (${pricingDataSources.status} = 'syncing' AND (${pricingDataSources.crawlLeaseUntil} IS NULL OR ${pricingDataSources.crawlLeaseUntil} < now()))`);

      if (!sources.every(source => isAutomaticPricingSource(source.status) || source.status === 'syncing')) throw new Error('CRAWLER_SOURCE_STATUS_INVALID');

      summary.totalSources = sources.length;

      logger.info(
        `[PriceScheduler] Toplu tarama başlatıldı. Toplam kaynak: ${sources.length} (${triggeredBy})`
      );

      // 2. Iterate sequentially with polite delay
      for (let i = 0; i < sources.length; i++) {
        let source = sources[i];
        let crawlClaim: string | null = null;

        try {
          const configObj =
            source.crawlerConfig && typeof source.crawlerConfig === "object"
              ? (source.crawlerConfig as Record<string, unknown>)
              : {};
          const isFileBackedOrOfficial =
            source.code.startsWith("csv:") ||
            configObj.kind === "licensed-csv-v1" ||
            ["official_gazette", "tuik_index", "epys_standard"].includes(source.category) ||
            source.code.startsWith("csb_") ||
            source.code.startsWith("tuik_");

          if (isFileBackedOrOfficial) {
            // Expired leases must recover even when this source is not crawled.
            if (source.status === "syncing") {
              const recoveryClaim = await claimCrawlSource(source.id);
              if (!recoveryClaim) throw new Error("CRAWLER_SOURCE_ALREADY_CLAIMED");
              await releaseCrawlSource(source.id, recoveryClaim);
            }
            logger.info(
              `[PriceScheduler] [${i + 1}/${sources.length}] Dosya/Resmi katalog kaynağı korundu (HTML tarama atlandı): ${source.name} (${source.code})`
            );
            summary.successfulSources++;
            summary.results.push({
              sourceCode: source.code,
              sourceName: source.name,
              status: "success",
              itemsCount: source.itemCount || 0,
              durationMs: 0,
            });
            continue;
          }

          logger.info(
            `[PriceScheduler] [${i + 1}/${sources.length}] Taranıyor: ${source.name} (${source.code})`
          );

          crawlClaim = await claimCrawlSource(source.id);
          if (!crawlClaim) throw new Error("CRAWLER_SOURCE_ALREADY_CLAIMED");

          // Crawl source
          const crawlResult = await priceCrawlerService.crawlSource({
            id: source.id,
            code: source.code,
            name: source.name,
            category: source.category,
            sourceUrl: source.sourceUrl,
            crawlerConfig: source.crawlerConfig as Record<string, unknown> | null,
          });

          if (crawlResult.status === "error") {
            summary.failedSources++;
            await releaseCrawlSource(source.id, crawlClaim);
            crawlClaim = null;

            summary.results.push({
              sourceCode: source.code,
              sourceName: source.name,
              status: "error",
              itemsCount: 0,
              durationMs: crawlResult.durationMs,
              error: crawlResult.errorMessage,
            });
          } else {
            let stagedForSource = 0;
            await db.transaction(async (tx) => {
              const [lockedSource] = await tx.select().from(pricingDataSources)
                .where(eq(pricingDataSources.id, source.id)).for("update");
              if (!lockedSource) throw new Error("PRICING_SOURCE_REMOVED_DURING_CRAWL");
              if (lockedSource.status !== "syncing" || (lockedSource.crawlLeaseToken !== crawlClaim || !lockedSource.crawlLeaseUntil || lockedSource.crawlLeaseUntil.getTime() <= Date.now()) || !isDeepStrictEqual(crawlSourceIdentity(lockedSource), crawlSourceIdentity(source))) throw new Error("PRICING_SOURCE_CHANGED_DURING_CRAWL");
              source = lockedSource;
              const activeRows = await tx
                .select()
                .from(priceFeedStaging)
                .where(
                  and(
                    eq(priceFeedStaging.sourceId, source.id),
                    inArray(priceFeedStaging.status, ["approved", "pending"])
                  )
                )
                .orderBy(desc(priceFeedStaging.crawledAt));

              const hasActiveRows = activeRows.length > 0;
              assertCrawlSourceProof({dataHash: source.dataHash, crawlHash: crawlResult.dataHash, hasActiveRows});
              const existingApproved = activeRows.filter(row => row.status === "approved");

              const approvedByCode = new Map<string, typeof existingApproved[number]>();
              for (const row of existingApproved) {
                if (!approvedByCode.has(row.itemCode)) {
                  approvedByCode.set(row.itemCode, row);
                }
              }

              // Clear old pending items for this source to avoid duplicates
              if (crawlResult.items.length > 0) {
                await tx
                  .delete(priceFeedStaging)
                  .where(
                    and(
                      eq(priceFeedStaging.sourceId, source.id),
                      eq(priceFeedStaging.status, "pending")
                    )
                  );

                for (const item of crawlResult.items) {
                  const normalizedUnit = inferCrawledItemUnit(
                    item.itemName,
                    source.code,
                    source.name,
                    item.unit
                  );
                  const prev = approvedByCode.get(item.itemCode);
                  const prevPrice = prev ? Number(prev.crawledPrice) : null;
                  const hasPrevPrice =
                    prevPrice !== null && Number.isFinite(prevPrice) && prevPrice > 0;

                  const unitChanged = Boolean(prev && prev.unit !== normalizedUnit);
                  // Keep the human-reviewed observation and its original timestamp intact.
                  if (prev && priceObservationMatchesSource(prev, source) && !unitChanged && hasPrevPrice && Math.abs(item.crawledPrice - prevPrice) < 0.005) {
                    continue;
                  }

                  const diffPercent = hasPrevPrice && !unitChanged
                    ? String(Math.round(((item.crawledPrice - prevPrice) / prevPrice) * 10000) / 100)
                    : null;
                  const notes = `[Gece Otomatik Tarama] ${item.notes}`;
                  await tx.insert(priceFeedStaging).values({
                    sourceId: source.id,
                    contentHash: crawlResult.dataHash,
              sourceIdentity: priceSourceIdentity(source),
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    unit: normalizedUnit,
                    currentPrice: hasPrevPrice && !unitChanged ? prevPrice.toFixed(2) : null,
                    crawledPrice: String(item.crawledPrice),
                    diffPercent,
                    sourceUrl: item.sourceUrl,
                    status: "pending",
                    reviewedAt: null,
                    reviewedByUserId: null,
                    confidenceScore: String(item.confidenceScore),
                    notes,
                    crawledAt: crawlResult.crawledAt,
                  });
                  stagedForSource++;
                }
              }

              const rollingValidityEnd = new Date(
                crawlResult.crawledAt.getTime() + 90 * 24 * 60 * 60 * 1000
              );

              // Update source stats & rolling validity window
              await tx
                .update(pricingDataSources)
                .set({
                  lastSyncAt: crawlResult.crawledAt,
                  status: "active",
                  crawlLeaseToken: null, crawlLeaseUntil: null,
                  itemCount: sql`GREATEST(${pricingDataSources.itemCount}, ${crawlResult.itemsCount})`,
                  ...(!hasActiveRows ? {
                    dataHash: crawlResult.dataHash,
                    validityStart: crawlResult.crawledAt,
                    validityEnd: rollingValidityEnd,
                  } : {}),
                  updatedAt: new Date(),
                })
                .where(eq(pricingDataSources.id, source.id));

              await tx.insert(adminAuditLogs).values({
                adminId: actorAdminId!, action: "pricing_source_nightly_crawled",
                details: { sourceId: source.id, sourceCode: source.code, triggeredBy,
                  actorKind: triggeredBy === "system_nightly_cron" ? "system" : "admin", itemsCount: crawlResult.itemsCount,
                  stagedForSource, timestamp: crawlResult.crawledAt.toISOString() },
              });
            });
            crawlClaim = null;
            summary.successfulSources++;
            summary.totalItemsStaged += stagedForSource;

            summary.results.push({
              sourceCode: source.code,
              sourceName: source.name,
              status: "success",
              itemsCount: crawlResult.itemsCount,
              durationMs: crawlResult.durationMs,
            });
          }
        } catch (sourceError) {
          if (crawlClaim) { try { await releaseCrawlSource(source.id, crawlClaim); } catch (releaseError) { logger.error("Crawler claim release failed", releaseError); } }
          summary.failedSources++;
          const errStr = sourceError instanceof Error ? sourceError.message : String(sourceError);
          summary.results.push({
            sourceCode: source.code,
            sourceName: source.name,
            status: "error",
            itemsCount: 0,
            durationMs: 0,
            error: errStr,
          });
        }

        // Polite delay between sources (2.5 seconds pause so server load remains minimal)
        if (i < sources.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
      }

      const totalDuration = Date.now() - startTime;
      summary.durationMs = totalDuration;
      summary.completedAt = new Date().toISOString();

      await this.recordBatchAudit(actorAdminId, 'nightly_batch_crawl_completed', triggeredBy, summary);

      logger.info(
        `[PriceScheduler] Toplu tarama başarıyla tamamlandı (${totalDuration}ms). ` +
          `${summary.successfulSources}/${summary.totalSources} kaynak tarandı, ${summary.totalItemsStaged} kalem havuza eklendi.`
      );

      return summary;
    } catch (error) {
      if (batchStarted && actorAdminId) {
        await this.recordBatchAudit(actorAdminId, 'nightly_batch_crawl_failed', triggeredBy, {
          ...summary, completedAt: new Date().toISOString(), durationMs: Date.now() - startTime,
        });
      }
      throw error;
    } finally {
      this.isRunningBatch = false;
      if (releaseScheduleLock) await releaseScheduleLock();
    }
  }

  private async recordBatchAudit(adminId: string, action: string, triggeredBy: string, summary: BatchRunSummary) {
    // Keep persisted operational status bounded and free of fetched content or raw errors.
    await db.insert(adminAuditLogs).values({ adminId, action, details: {
      triggeredBy, startedAt: summary.startedAt, completedAt: summary.completedAt,
      totalSources: summary.totalSources, successfulSources: summary.successfulSources,
      failedSources: summary.failedSources, totalItemsStaged: summary.totalItemsStaged, durationMs: summary.durationMs,
    } });
  }

  async getStatus() {
    const latest = await this.readLatestAudit();
    return {
      isSchedulerActive: this.timer !== null,
      isRunningBatch: this.isRunningBatch,
      nextScheduledRun: this.getNextScheduledRun().toISOString(),
      lastRunAt: latest?.createdAt.toISOString() ?? null,
      lastSummary: latest ? auditSummary(latest) : null,
      lastRunOutcome: latest ? (latest.action === 'nightly_batch_crawl_failed' ? 'failed' : 'completed') : null,
      config: {
        scheduleTime: "03:00 TSİ",
        timezone: CRAWLER_TIMEZONE,
        queueStrategy: "sequential_polite",
        delayMsBetweenSources: 2500,
        boundedWorkerParsing: true,
      },
    };
  }
}

export const priceSchedulerService = new PriceSchedulerService();
