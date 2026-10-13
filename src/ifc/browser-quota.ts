import { fetchWithAuth } from "@/lib/api";

/** Returns null when the analysis may run, otherwise the message to show (L-9). */
export function browserQuotaDenial(status: number, code: string | undefined): string | null {
  if (status >= 200 && status < 300) return null;
  if (code === "IFC_QUOTA_EXCEEDED") return "Aylık IFC kotanız dolmuştur. Paketinizi yükseltin veya gelecek ay tekrar deneyin.";
  if (code === "IFC_NOT_AVAILABLE") return "Aktif bir IFC paketi bulunmadığından IFC ön analizi kullanılamaz.";
  if (status === 403) return "IFC ön analizi için yetkiniz yok.";
  return "IFC kotası şu anda doğrulanamıyor; lütfen daha sonra tekrar deneyin.";
}

/** Books one IFC analysis on the server before the browser parses the file. */
export async function reserveBrowserIfcAnalysis(): Promise<string | null> {
  try {
    const response = await fetchWithAuth("/api/ifc/browser-analyses", { method: "POST" });
    const body = response.ok ? undefined : await response.json().catch(() => undefined) as { code?: string } | undefined;
    return browserQuotaDenial(response.status, body?.code);
  } catch {
    return browserQuotaDenial(0, undefined);
  }
}
