/**
 * Pre-registered operating and performance budgets for Faz 7 / T45.
 *
 * These ceilings are registered BEFORE runtime measurements are evaluated so
 * regression tests and the expert trial guide (/admin/roadmap/expert-review)
 * share one authoritative budget source.
 */
export const PERFORMANCE_BUDGETS = Object.freeze({
  version: "BIM-PERF-2026-10-26.1",
  frontend: Object.freeze({
    /** Maximum minified raw size (bytes) of the initial entry chunk (index-*.js). */
    entryChunkMaxBytes: 120 * 1024,
    /** Heavy optional vendor chunks that must never be preloaded on initial HTML load or route entry. */
    forbiddenInitialPreloadChunks: Object.freeze(["charts", "exceljs", "ifc-viewer"]),
    /** Route chunks that must not directly reference the exceljs chunk unless an .xlsx helper chunk is dynamically loaded. */
    exceljsIsolatedFromRouteChunks: Object.freeze(["CreateQuote", "SmartCheck", "Dashboard", "LandingPage"]),
    /** Browser-side .xlsx upload hard ceiling (bytes). */
    browserXlsxMaxBytes: 5 * 1024 * 1024,
    /** Browser-side IFC preview hard ceiling (bytes). */
    browserIfcPreviewMaxBytes: 50 * 1024 * 1024,
  }),
  containers: Object.freeze({
    app: Object.freeze({
      memLimitMb: 1536,
      maxOldSpaceSizeMb: 768,
      cpus: 1.0,
      pidsLimit: 256,
      pgPoolMax: 4,
    }),
    worker: Object.freeze({
      memLimitMb: 1024,
      maxOldSpaceSizeMb: 768,
      cpus: 1.0,
      pidsLimit: 128,
      concurrency: 2,
    }),
    ifcWorker: Object.freeze({
      memLimitMb: 2048,
      maxOldSpaceSizeMb: 1024,
      cpus: 1.5,
      pidsLimit: 128,
      concurrency: 1,
      timeoutSec: 600,
      maxIfcFileMb: 100,
    }),
    spreadsheetWorker: Object.freeze({
      maxOldSpaceSizeMb: 256,
      maxConcurrentProcesses: 2,
      timeoutMs: 30_000,
      maxFileBytes: 25 * 1024 * 1024,
      maxRows: 25_000,
      maxColumns: 256,
      maxCells: 650_000,
      maxCellChars: 32_768,
    }),
  }),
  slos: Object.freeze({
    /** 100 MB synthetic IFC parse ceiling (ms) in local/CI benchmark. */
    synthetic100MbIfcParseMaxMs: 6000,
    /** 1,000-row XLSX parse p95 ceiling (ms) via ExcelJS / isolated worker. */
    xlsx1000RowParseP95MaxMs: 2500,
    /** 20-request concurrent multi-tenant DB transaction p95 ceiling (ms) on PG16. */
    concurrentTenantDbP95MaxMs: 250,
    /** Worker queue claim + lease acquisition p95 ceiling (ms) on PG16. */
    workerQueueClaimP95MaxMs: 150,
    /** Sentry PII scrubbing + error sanitization per-event ceiling (ms). */
    telemetryScrubMaxMs: 5,
    /** AI provider router fallback overhead ceiling (ms) when primary provider fails. */
    aiProviderFallbackOverheadMaxMs: 50,
    /** Bounded AI upstream HTTP response body limit (bytes). */
    aiResponseMaxBytes: 256 * 1024,
  }),
});
