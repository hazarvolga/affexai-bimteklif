/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import type { TourStep } from "./tour-types";

const MANAGERS = ["owner", "admin", "manager"] as const;
const BILLING = ["owner", "admin", "super_admin"] as const;
const OWNERS = ["owner", "admin"] as const;

/**
 * Çalışma alanı turu: menüdeki her ana sayfayı sırayla gezer. Metinler yalnız ürünün bugün
 * yaptığını anlatır; ön hesap niteliğindeki hesaplar öyle belirtilir.
 */
export const USER_TOUR_STEPS: readonly TourStep[] = [
  {
    route: "/app",
    targetSelector: '[data-tour="workflow-hub"]',
    pageLabel: "Panel",
    badge: "BAŞLANGIÇ",
    title: "Nereden başlayacaksınız?",
    description:
      "Elinizdeki kaynağı seçin: Excel/CSV metraj, IFC modeli, elle girilecek kalemler veya kotadan düşmeyen örnek proje. Seçim ilgili ekranı doğrudan açar.",
    tip: "Arsa ön fizibilitesi, taşeron hakediş kontrolü ve mevzuat araçları hemen altındaki \"Diğer araçlar\" satırındadır.",
    preferredPlacement: "bottom",
  },
  {
    route: "/app",
    targetSelector: '[data-tour="blueprint-header"]',
    pageLabel: "Panel",
    badge: "PAFTA ANTETİ",
    title: "Firma ve Katalog Özeti",
    description:
      "Aktif firma, para birimi ve fiyat kataloğunun durumu burada özetlenir. Teklif PDF'lerinde firma bilgileri antet olarak kullanılır.",
    preferredPlacement: "bottom",
  },
  {
    route: "/app",
    targetSelector: '[data-tour="subcontractor-shield"]',
    pageLabel: "Panel",
    badge: "ŞANTİYE KONTROLÜ",
    title: "Taşeron Hakediş Kontrolü",
    description:
      "IFC mahal cetvelinden daire başına şap ve zemin kaplaması tavanı çıkarılır; kalınlık, fire ve dozajı siz girersiniz. Taşeronun beyanı bu tavanla karşılaştırılır ve aşan kalemler işaretlenir.",
    preferredPlacement: "top",
  },
  {
    route: "/app",
    targetSelector: '[data-tour="public-procurement"]',
    pageLabel: "Panel",
    badge: "KAMU İHALESİ",
    title: "Aşırı Düşük Teklif ve Fiyat Farkı Hesapları",
    description:
      "KİK aşırı düşük teklif sınır değeri (Tebliğ m.45.1.1) ve 4735 fiyat farkı hesaplayıcılarına buradan ulaşırsınız. Katsayı ve endeksleri siz girersiniz.",
    tip: "Sonuçlar ön hesap niteliğindedir; bağımsız uzman onayından geçmemiştir.",
    preferredPlacement: "top",
  },
  {
    route: "/app/quotes",
    pageLabel: "Teklifler & Projeler",
    badge: "TEKLİFLER",
    title: "Teklif ve Proje Listesi",
    description:
      "Hazırladığınız teklifler, durumları ve revizyonları burada listelenir. Bir teklifi açıp düzenleyebilir, PDF olarak dışa aktarabilirsiniz.",
  },
  {
    route: "/app/quotes/new",
    pageLabel: "Yeni Teklif",
    badge: "TEKLİF HAZIRLAMA",
    title: "Yeni Teklif",
    description:
      "Kalemleri elle girebilir, Excel'den içe aktarabilir ya da IFC icmalinden aktarabilirsiniz. Referans fiyatlar yalnız bilgi amaçlı gösterilir; birim fiyatı siz belirlersiniz. Kâr marjı ve süreye bağlı eskalasyon teklif içinde hesaplanır.",
    roles: MANAGERS,
  },
  {
    route: "/app/smartcheck",
    pageLabel: "SmartCheck & e-PYS",
    badge: "DOSYA KONTROLÜ",
    title: "SmartCheck ve e-PYS Ön Kontrolü",
    description:
      "IFC modelinizi, Excel/CSV metraj cetvelinizi veya PDF paftalarınızı yükleyin. Dosyalar RG 33331 e-PYS ekleri, ISO 19650 dosya adlandırma ve şirketin 3x3 kalite politikasına göre ön kontrolden geçer.",
    tip: "3x3 bir şirket kalite politikasıdır, normatif bir kural değildir. Sonuçlar resmî incelemenin yerini tutmaz.",
  },
  {
    route: "/app/ifc-parser",
    pageLabel: "IFC Ön Analiz",
    badge: "IFC METRAJ",
    title: "IFC Ön Analizi ve Metraj Kapsama Kartı",
    description:
      "IFC dosyası seçildiğinde metraj tarayıcıda hazırlanır. Kapsama kartı; toplam ve ölçülen eleman sayısını, icmale yerleşme oranını ve tutarlılık bulgularını (mükerrer GlobalId, bağlantısız boşluk, malzemesiz eleman, farklı beton sınıfı) gösterir.",
    tip: "Yapısal elemanlar malzemesine göre icmale girer; icmale girmeyenlerin miktarı 'fiyatlandırılmadı' olarak gösterilir, hiçbir değer varsayılmaz.",
  },
  {
    route: "/app/crm",
    pageLabel: "Müşteriler (CRM)",
    badge: "MÜŞTERİLER",
    title: "Müşteriler ve Fırsatlar",
    description:
      "Müşterilerinizi ve teklif fırsatlarını aşama aşama takip edin; notlar ve aşama değişiklikleri fırsatın geçmişinde tutulur.",
  },
  {
    route: "/app/fiyat-katalogu",
    pageLabel: "Fiyat Kataloğu",
    badge: "FİYAT KATALOĞU",
    title: "Firma Fiyat Kataloğu",
    description:
      "Kendi birim fiyat listenizi Excel ile ekleyin. Teklif ve IFC icmali yalnız burada onayladığınız, KDV oranı belirtilmiş fiyatları kullanır.",
    roles: MANAGERS,
  },
  {
    route: "/app/market-intelligence",
    pageLabel: "Tedarikçi & Piyasa",
    badge: "PİYASA FİYATLARI",
    title: "Tedarikçi Teklifleri ve Piyasa Fiyatları",
    description:
      "Tedarikçi tekliflerini kaydedip karşılaştırın. Aykırı değerler işaretlenir; bir fiyat ancak incelemeden geçtikten sonra referans olarak kullanılır.",
    roles: MANAGERS,
  },
  {
    route: "/app/profitability",
    pageLabel: "Kârlılık Analizi",
    badge: "KÂRLILIK",
    title: "Kârlılık Analizi",
    description: "Sonuçlanan tekliflerinizde kazanılan ve kaybedilen hacmi ve kazanma oranını izleyin.",
    roles: MANAGERS,
  },
  {
    route: "/app/billing",
    pageLabel: "Faturalandırma",
    badge: "PAKET VE KOTA",
    title: "Paket, Kota ve Ödeme",
    description:
      "Aktif paketinizi, aylık teklif, IFC ve PDF kotalarınızı görün. Paket değişikliği ve ödeme Havale/EFT ile yapılır; kartla ödeme henüz yoktur.",
    roles: BILLING,
  },
  {
    route: "/app/settings",
    pageLabel: "Ayarlar",
    badge: "FİRMA AYARLARI",
    title: "Firma, Ekip ve Davetler",
    description: "Firma bilgilerinizi, para birimini ve ekip üyelerini yönetin; yeni kullanıcıları rol belirterek davet edin.",
    roles: OWNERS,
  },
  {
    route: "/app/academy",
    pageLabel: "Akademi (Yardım)",
    badge: "YARDIM",
    title: "Akademi ve Yardım",
    description: "Metraj, keşif, hakediş ve BIM süreçleri için rehberler ve sözlük burada. Bu turu istediğiniz zaman menüdeki Hızlı Tur düğmesiyle yeniden başlatabilirsiniz.",
  },
];
