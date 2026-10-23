import { fetchWithAuth } from "@/lib/api";

const PACKAGES_PATH = "/app/billing";

export type BrowserQuotaAction =
  | { kind: "link"; label: string; to: string }
  | { kind: "resend-verification"; label: string };

export interface BrowserQuotaDenial {
  /** Stable server code used to select copy; never rendered directly. */
  code: string;
  title: string;
  message: string;
  action?: BrowserQuotaAction;
}

type DenialCopy = Omit<BrowserQuotaDenial, "code">;
const packagesLink = (label: string): BrowserQuotaAction => ({ kind: "link", label, to: PACKAGES_PATH });

const DENIAL_BY_CODE: Readonly<Record<string, DenialCopy>> = {
  EMAIL_VERIFICATION_REQUIRED: {
    title: "E-posta doğrulaması gerekli",
    message: "IFC ön analizini başlatmak için önce e-posta adresinizi doğrulayın. Gelen kutunuzdaki doğrulama bağlantısına tıklayın ya da yeni bir bağlantı isteyin.",
    action: { kind: "resend-verification", label: "Doğrulama bağlantısı gönder" },
  },
  IFC_NOT_AVAILABLE: {
    title: "IFC paketi gerekli",
    message: "Hesabınızda IFC ön analizini içeren aktif bir paket yok. Paketler sayfasından IFC içeren bir paket seçin.",
    action: packagesLink("Paketleri incele"),
  },
  SUBSCRIPTION_REQUIRED: {
    title: "Abonelik gerekli",
    message: "IFC ön analizi için aktif bir abonelik gerekiyor. Paketler sayfasından bir paket seçerek aboneliğinizi başlatın.",
    action: packagesLink("Abonelik başlat"),
  },
  SUBSCRIPTION_INACTIVE: {
    title: "Aboneliğiniz aktif değil",
    message: "Aboneliğinizin süresi dolmuş ya da henüz başlamamış. IFC ön analizine devam etmek için aboneliğinizi yenileyin.",
    action: packagesLink("Aboneliği yenile"),
  },
  PLAN_UNAVAILABLE: {
    title: "Paketiniz kullanılamıyor",
    message: "Mevcut paketiniz artık sunulmuyor. IFC ön analizine devam etmek için Paketler sayfasından güncel bir paket seçin.",
    action: packagesLink("Paketleri incele"),
  },
  IFC_QUOTA_EXCEEDED: {
    title: "Aylık IFC kotası doldu",
    message: "Aylık IFC kotanız dolmuştur. Paketinizi yükseltin veya gelecek ay tekrar deneyin.",
    action: packagesLink("Paketi yükselt"),
  },
};

const FORBIDDEN: DenialCopy = {
  title: "Yetki yok",
  message: "IFC ön analizi için yetkiniz yok. Firma yöneticinizle iletişime geçin.",
};

const UNAVAILABLE: DenialCopy = {
  title: "IFC kotası doğrulanamadı",
  message: "IFC kotası şu anda doğrulanamıyor; lütfen daha sonra tekrar deneyin.",
};

/** Returns null when the analysis may run, otherwise persistent Turkish guidance. */
export function browserQuotaDenial(status: number, code: string | undefined): BrowserQuotaDenial | null {
  if (status >= 200 && status < 300) return null;
  const known = code ? DENIAL_BY_CODE[code] : undefined;
  const copy = known ?? (status === 403 ? FORBIDDEN : UNAVAILABLE);
  return { code: code ?? "UNKNOWN", ...copy };
}

/** Books one IFC analysis on the server before the browser parses the file. */
export async function reserveBrowserIfcAnalysis(): Promise<BrowserQuotaDenial | null> {
  try {
    const response = await fetchWithAuth("/api/ifc/browser-analyses", { method: "POST" });
    const body = response.ok ? undefined : await response.json().catch(() => undefined) as { code?: unknown } | undefined;
    return browserQuotaDenial(response.status, typeof body?.code === "string" ? body.code : undefined);
  } catch {
    return browserQuotaDenial(0, undefined);
  }
}

/** Requests a fresh verification link; true only when the server accepted it. */
export async function requestVerificationEmail(email: string): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
