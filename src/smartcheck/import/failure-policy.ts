// Imported by the browser bundle too, so this module stays free of server-only dependencies.
const NO_ADMISSIBLE_QUANTITY_CODE = "IFC_NO_ADMISSIBLE_QUANTITY_EVIDENCE";

const NO_ADMISSIBLE_QUANTITY_MESSAGE =
  "Modelde metraja alınabilecek miktar bulunamadı. Geometriden hesaplanan hacim metraj kanıtı sayılmaz. " +
  "Modeli BIM yazılımından miktarlarla (Base Quantities) yeniden dışa aktarıp yükleyin.";

/** These repeat on the same file, so a retry only blocks the single IFC worker slot. */
const PERMANENT_FAILURE_CODES: ReadonlySet<string> = new Set([
  NO_ADMISSIBLE_QUANTITY_CODE,
  "IFC_EMPTY_MODEL",
  "IFC_SCHEMA_UNSUPPORTED",
]);

const GENERIC_FAILURE_LABEL = "İşleme hatası";

export function isPermanentFailureCode(code: string | null | undefined): boolean {
  return code != null && PERMANENT_FAILURE_CODES.has(code);
}

function failureCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const { code } = error as Error & { code?: unknown };
  return typeof code === "string" ? code : error.message;
}

/** Returns normally for a permanent failure so Graphile completes the job; the run is already marked failed. */
export function settleIfcJobFailure(error: unknown, capture: (error: unknown) => void): void {
  if (isPermanentFailureCode(failureCode(error))) return;
  capture(error);
  throw error;
}

export function smartCheckFailureMessage(error: unknown): string | null {
  return failureCode(error) === NO_ADMISSIBLE_QUANTITY_CODE ? NO_ADMISSIBLE_QUANTITY_MESSAGE : null;
}

export function queueFailureLabel(run: { errorCode: string | null; errorMessage: string | null }): string {
  // Runs stored before this message existed carry the raw code in errorMessage.
  if (run.errorCode === NO_ADMISSIBLE_QUANTITY_CODE) return NO_ADMISSIBLE_QUANTITY_MESSAGE;
  return isPermanentFailureCode(run.errorCode) && run.errorMessage ? run.errorMessage : GENERIC_FAILURE_LABEL;
}
