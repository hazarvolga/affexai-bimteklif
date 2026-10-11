import { db, pool } from "../../db";
import { adminAuditLogs, priceFeedStaging, pricingDataSources, users } from "../../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { acquireCrawlerScheduleLock } from "./scheduler-lock";
import { priceCrawlerService } from "./priceCrawlerService";

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

export class PriceSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isRunningBatch = false;
  private lastRunAt: Date | null = null;
  private lastSummary: BatchRunSummary | null = null;

  /**
   * Calculate next run time (default: 03:00 AM local time)
   */
  getNextScheduledRun(): Date {
    const next = new Date();
    next.setHours(3, 0, 0, 0);
    if (next.getTime() <= Date.now()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  /**
   * Start scheduled check interval (runs every 15 minutes to verify if 03:00 window reached)
   */
  start(): void {
    if (this.timer) return;

    console.log(
      `[PriceScheduler] Gece otomatik tarayıcı zamanlayıcısı başlatıldı. Bir sonraki tarama: ${this.getNextScheduledRun().toLocaleString("tr-TR")}`
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
    if (now.getHours() === 3 && now.getMinutes() < 20) {
      // Check if already ran today
      if (this.lastRunAt && this.lastRunAt.toDateString() === now.toDateString()) {
        return;
      }
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

    let releaseScheduleLock: (() => Promise<void>) | null = null;
    try {
      releaseScheduleLock = await acquireCrawlerScheduleLock(pool);
      if (!releaseScheduleLock) throw new Error("CRAWLER_BATCH_ALREADY_RUNNING");
      // A completed nightly batch survives API restarts and coordinates replicas.
      if (triggeredBy === "system_nightly_cron") {
        const [completed] = await db.select({ id: adminAuditLogs.id }).from(adminAuditLogs).where(and(
          eq(adminAuditLogs.action, "nightly_batch_crawl_completed"),
          sql`${adminAuditLogs.details}->>'triggeredBy' = 'system_nightly_cron'`,
          sql`${adminAuditLogs.createdAt} >= date_trunc('day', now())`,
        )).limit(1);
        if (completed) {
          this.lastRunAt = new Date();
          return { ...summary, completedAt: new Date().toISOString() };
        }
      }
      // 1. Fetch active pricing sources
      const sources = await db
        .select()
        .from(pricingDataSources)
        .where(sql`${pricingDataSources.status} != 'disabled'`);

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
      this.lastRunAt = new Date();
      this.lastSummary = summary;

      // Record audit log
      let actorAdminId = adminUserId;
      if (!actorAdminId) {
        const [superAdmin] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.isSuperAdmin, true))
          .limit(1);
        actorAdminId = superAdmin?.id;
      }

      if (actorAdminId) {
        await db.insert(adminAuditLogs).values({
          adminId: actorAdminId,
          action: "nightly_batch_crawl_completed",
          details: {
            triggeredBy,
            totalSources: summary.totalSources,
            successfulSources: summary.successfulSources,
            failedSources: summary.failedSources,
            totalItemsStaged: summary.totalItemsStaged,
            durationMs: summary.durationMs,
          },
        });
      }

      console.log(
        `[PriceScheduler] Toplu tarama başarıyla tamamlandı (${totalDuration}ms). ` +
          `${summary.successfulSources}/${summary.totalSources} kaynak tarandı, ${summary.totalItemsStaged} kalem havuza eklendi.`
      );

      return summary;
    } finally {
      this.isRunningBatch = false;
      if (releaseScheduleLock) await releaseScheduleLock();
    }
  }

  getStatus() {
    return {
      isSchedulerActive: true,
      isRunningBatch: this.isRunningBatch,
      nextScheduledRun: this.getNextScheduledRun().toISOString(),
      lastRunAt: this.lastRunAt ? this.lastRunAt.toISOString() : null,
      lastSummary: this.lastSummary,
      config: {
        scheduleTime: "03:00 TSİ",
        queueStrategy: "sequential_polite",
        delayMsBetweenSources: 2500,
        boundedWorkerParsing: true,
      },
    };
  }
}

export const priceSchedulerService = new PriceSchedulerService();
