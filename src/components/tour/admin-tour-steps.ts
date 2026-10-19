/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import type { TourStep } from "./tour-types";

/** Süper admin turu: Platform Yönetimi menüsündeki sayfaları sırayla gezer. */
export const ADMIN_TOUR_STEPS: readonly TourStep[] = [
  {
    route: "/admin",
    pageLabel: "Genel Bakış",
    badge: "PLATFORM",
    title: "Platform Genel Bakışı",
    description: "Firma, kullanıcı, kuyruk ve kullanım durumunun özeti. Platform yönetimine buradan başlarsınız.",
  },
  {
    route: "/admin/leads",
    pageLabel: "Ön Kayıt & Adaylar",
    badge: "ADAYLAR",
    title: "Ön Kayıt ve Adaylar",
    description: "Ön kayıt ve pilot başvurularını görün, durumlarını güncelleyin.",
  },
  {
    route: "/admin/tenants",
    pageLabel: "Firmalar",
    badge: "FİRMALAR",
    title: "Firmalar ve Abonelikler",
    description:
      "Kayıtlı firmaları, paketlerini ve kullanımlarını görün. Firma ayrıntısından kotaları düzenleyebilir, destek için firmanın çalışma alanına geçebilirsiniz.",
    tip: "Firma adına geçiş (impersonation) 15 dakika sürer ve denetim loglarına kaydedilir.",
  },
  {
    route: "/admin/queue",
    pageLabel: "IFC Kuyruk",
    badge: "KUYRUK",
    title: "IFC ve Belge Kuyruğu",
    description: "Sunucuda işlenen IFC, Excel ve PDF işlerini izleyin; takılan ya da başarısız işleri yeniden deneyin veya kurtarın.",
  },
  {
    route: "/admin/pricing-sources",
    pageLabel: "Fiyat & Poz Kaynakları",
    badge: "FİYAT KAYNAKLARI",
    title: "Fiyat ve Poz Kaynakları",
    description:
      "ÇŞB 2026 birim fiyat ve rayiç kitapları (6 kitap, 18.848 satır, SHA-256 mühürlü) ve diğer fiyat kaynaklarının içe aktarma ve kapsam durumu.",
  },
  {
    route: "/admin/plans",
    pageLabel: "Paket Yönetimi",
    badge: "PAKETLER",
    title: "Paket Yönetimi",
    description: "Satıştaki paketleri, fiyatlarını ve teklif, IFC, PDF kotalarını düzenleyin; yayımlanan paketler fiyat sayfasında görünür.",
  },
  {
    route: "/admin/reports",
    pageLabel: "Raporlar",
    badge: "RAPORLAR",
    title: "Kullanım ve Kapasite Raporları",
    description: "Firmaların kota kullanımını ve sistem kapasitesini dönem bazında izleyin.",
  },
  {
    route: "/admin/logs",
    pageLabel: "Denetim Logları",
    badge: "DENETİM",
    title: "Denetim Logları",
    description: "Yönetici işlemleri, firma adına geçişler ve kritik değişiklikler burada kayıtlıdır.",
  },
  {
    route: "/admin/roadmap",
    pageLabel: "Geliştirici Yol Haritası",
    badge: "YOL HARİTASI",
    title: "Geliştirici Yol Haritası",
    description: "Revizyon geçmişi, yapılan ve bekleyen işler ile her revizyonun önceki ve yeni durumu.",
  },
  {
    route: "/admin/roadmap/calculations",
    pageLabel: "Hesaplama Yöntemleri",
    badge: "HESAPLAR",
    title: "Hesaplama Yöntemleri",
    description:
      "Her hesap modülünün formülü, kaynakları, test dosyaları ve doğrulama durumu. Uzman onayı olmayan modüller açıkça ön hesap olarak işaretlidir.",
  },
];
