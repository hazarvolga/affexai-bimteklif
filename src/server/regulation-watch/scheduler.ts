import { fetchCrawlerHtml, postCrawlerJson } from "../crawler/safe-fetch";
import { logger } from "../logger";
import { readGazettePdfText } from "./pdf-text";
import { runRegulationWatch } from "./service";
import { regulationWatchStore } from "./store";

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 60 * 1000;

async function check() {
  try {
    const result = await runRegulationWatch({ store: regulationWatchStore, fetchHtml: url => fetchCrawlerHtml(url), postJson: postCrawlerJson, readPdfText: readGazettePdfText, now: new Date() });
    logger.info(`[RegulationWatch] ${result.checked} gün kontrol edildi, ${result.matched} kayıt, ${result.failed} hata.`);
  } catch (error) {
    logger.error("[RegulationWatch] Kontrol tamamlanamadı", { error: error instanceof Error ? error.message : "UNKNOWN" });
  }
}

export function startRegulationWatch(): void {
  setTimeout(() => void check(), FIRST_CHECK_DELAY_MS).unref();
  setInterval(() => void check(), CHECK_INTERVAL_MS).unref();
}
