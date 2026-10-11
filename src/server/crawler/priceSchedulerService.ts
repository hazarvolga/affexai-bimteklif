import { db, pool } from "../../db";
import { adminAuditLogs, priceFeedStaging, pricingDataSources, users } from "../../db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { acquireCrawlerScheduleLock } from "./scheduler-lock";
import { priceCrawlerService } from "./priceCrawlerService";
import { CRAWLER_TIMEZONE, crawlerDayStart, crawlerScheduleDue, nextCrawlerRun } from "./scheduler-time";
import { isAutomaticPricingSource } from './source-eligibility';

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

    console.log(
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
      console.log("[PriceScheduler] Gece tarayıcı zamanlayıcısı durduruldu.");
    }
  }

  private async checkAndExecuteSchedule(): Promise<void> {
    const now = new Date();
    // Window: between 03:00 and 03:20 AM
    if (crawlerScheduleDue(now)) {
      console.log("[PriceScheduler] 03:00 Gece otomatik sıralı tarama başlatılıyor...");
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
        .where(eq(pricingDataSources.status, 'active'));

      if (!sources.every(source => isAutomaticPricingSource(source.status))) throw new Error('CRAWLER_SOURCE_STATUS_INVALID');

      summary.totalSources = sources.length;

      console.log(
        `[PriceScheduler] Toplu tarama başlatıldı. Toplam kaynak: ${sources.length} (${triggeredBy})`
      );

      // 2. Iterate sequentially with polite delay
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];

        try {
          console.log(
            `[PriceScheduler] [${i + 1}/${sources.length}] Taranıyor: ${source.name} (${source.code})`
          );

          // Mark source as syncing
          await db
            .update(pricingDataSources)
            .set({ status: "syncing", updatedAt: new Date() })
            .where(eq(pricingDataSources.id, source.id));

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
            await db
              .update(pricingDataSources)
              .set({ status: "error", updatedAt: new Date() })
              .where(eq(pricingDataSources.id, source.id));

            summary.results.push({
              sourceCode: source.code,
              sourceName: source.name,
              status: "error",
              itemsCount: 0,
              durationMs: crawlResult.durationMs,
              error: crawlResult.errorMessage,
            });
          } else {
            summary.successfulSources++;
            summary.totalItemsStaged += crawlResult.itemsCount;

            // Clear old pending items for this source to avoid duplicates
            if (crawlResult.items.length > 0) {
              await db
                .delete(priceFeedStaging)
                .where(
                  and(
                    eq(priceFeedStaging.sourceId, source.id),
                    eq(priceFeedStaging.status, "pending")
                  )
                );

              for (const item of crawlResult.items) {
                await db.insert(priceFeedStaging).values({
                  sourceId: source.id,
                  itemCode: item.itemCode,
                  itemName: item.itemName,
                  unit: item.unit,
                  currentPrice: item.currentPrice !== null ? String(item.currentPrice) : null,
                  crawledPrice: String(item.crawledPrice),
                  diffPercent: item.diffPercent !== null ? String(item.diffPercent) : null,
                  sourceUrl: item.sourceUrl,
                  status: "pending",
                  confidenceScore: String(item.confidenceScore),
                  notes: `[Gece Otomatik Tarama] ${item.notes}`,
                  crawledAt: crawlResult.crawledAt,
                });
              }
            }

            // Update source stats
            await db
              .update(pricingDataSources)
              .set({
                lastSyncAt: crawlResult.crawledAt,
                status: "active",
                itemCount: sql`GREATEST(${pricingDataSources.itemCount}, ${crawlResult.itemsCount})`,
                dataHash: crawlResult.dataHash || source.dataHash,
                updatedAt: new Date(),
              })
              .where(eq(pricingDataSources.id, source.id));

            summary.results.push({
              sourceCode: source.code,
              sourceName: source.name,
              status: "success",
              itemsCount: crawlResult.itemsCount,
              durationMs: crawlResult.durationMs,
            });
          }
        } catch (sourceError) {
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

      console.log(
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
