export const IFC_BROWSER_PREVIEW_MAX_BYTES = 50 * 1024 * 1024;
export function canPreviewIfcInBrowser(size: number): boolean {
  return Number.isFinite(size) && size >= 0 && size <= IFC_BROWSER_PREVIEW_MAX_BYTES;
}
