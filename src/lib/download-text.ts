/** Metni tarayıcıda dosya olarak indirir (CSV raporları için). */
export function downloadTextFile(content: string, fileName: string, mimeType = "text/csv;charset=utf-8;"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Dosya adında yalnız güvenli karakterleri bırakır. */
export function safeFileStem(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "bimmetraj";
}
