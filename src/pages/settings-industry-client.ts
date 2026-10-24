export type IndustrySettingsFetcher = (url: string, options: RequestInit) => Promise<Pick<Response, "ok" | "status">>;

export async function persistIndustryEnabled(
  fetcher: IndustrySettingsFetcher,
  industryId: string,
  isEnabled: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const response = await fetcher("/api/company/industry-settings", {
    method: "POST",
    body: JSON.stringify({ industryId, isEnabled }),
  });
  if (response.ok) return { ok: true };
  if (response.status === 404) return { ok: false, message: "Sektör bulunamadı veya kullanıma kapalı." };
  if (response.status === 503) return { ok: false, message: "Sektör kataloğu geçici olarak kullanılamıyor." };
  return { ok: false, message: "Ayarlar güncellenemedi." };
}
