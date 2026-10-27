import { Link } from "react-router-dom";

interface PreviewTask {
  audience: string;
  title: string;
  task: string;
  path: string;
  /** Not on the public site; reachable only here, after sign-in. */
  unpublished?: boolean;
}

export const EXPERT_PREVIEW_TASKS: readonly PreviewTask[] = [
  {
    audience: "İhale / teknik ofis",
    title: "KİK aşırı düşük teklif sınır değeri",
    task: "Sonucunu bildiğiniz son ihalenizin yaklaşık maliyetini ve tekliflerini girin; sınır değer sizinkiyle tutuyor mu?",
    path: "/hesaplayicilar/kik-asiri-dusuk-teklif",
  },
  {
    audience: "Hakediş / sözleşme",
    title: "4735 fiyat farkı",
    task: "Hesapladığınız bir hakediş döneminin endekslerini ve katsayılarını girin; fiyat farkı (F) tutuyor mu?",
    path: "/hesaplayicilar/fiyat-farki-4735",
  },
  {
    audience: "Müteahhit / mali müşavir",
    title: "Müteahhitlik yetki belgesi grubu (YAMBİS)",
    task: "Bilinen bir firmanın bilanço, ciro ve iş deneyimi verilerini girin; çıkan grup Bakanlığın verdiği grupla aynı mı?",
    path: "/app/uzman-onizleme/yambis",
    unpublished: true,
  },
  {
    audience: "Mali müşavir / müteahhit",
    title: "Kat karşılığı paylaşım ve KDV",
    task: "Tamamlanmış bir kat karşılığı projesinin değerlerini girin; paylaşım ve satır bazlı KDV sizin hesabınızla tutuyor mu?",
    path: "/app/uzman-onizleme/kat-karsiligi",
    unpublished: true,
  },
  {
    audience: "Müteahhit / proje yöneticisi",
    title: "Teklif hazırlama",
    task: "Gerçek bir işin teklifini baştan sona hazırlayın; eksik veya yanlış gelen adımı not edin.",
    path: "/app/quotes/new",
  },
  {
    audience: "BIM / statik",
    title: "IFC metraj ve SmartCheck",
    task: "Bir IFC modelini yükleyin; çıkan metrajı kendi metrajınızla karşılaştırın.",
    path: "/app/smartcheck",
  },
];

export function ExpertPreview() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <span className="section-index">UZMAN ÖNİZLEMESİ</span>
        <h1 className="mt-1 font-display-serif text-3xl text-foreground">Sistemi sizin bildiğiniz bir örnekle sınayın</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Uzmanlık alanınıza uyan tek bir görevi seçin ve sonucunu zaten bildiğiniz bir örnek kullanın. 15 dakika yeterli. Her sonucun
          altında "Bu sonuç sizin hesabınızla tutuyor mu?" sorusu vardır; diğer ekranlarda üst çubuktaki <strong>Geri Bildirim</strong>{" "}
          butonunu kullanın.
        </p>
      </header>

      <div role="note" className="border border-amber-500/50 bg-amber-500/10 p-4 text-xs text-foreground">
        Bu önizlemedeki hesaplar bağımsız uzman tarafından henüz doğrulanmamıştır. Sonuçları sözleşme, vergi veya ihale kararında kullanmayın.
        Girdiğiniz değerler, siz açıkça onay vermedikçe geri bildirimle birlikte gönderilmez.
      </div>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Önizleme görevleri">
        {EXPERT_PREVIEW_TASKS.map(item => (
          <li key={item.path} className="flex flex-col border border-border bg-card p-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.audience}</span>
              {item.unpublished && (
                <span className="border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground">
                  Yayında değil
                </span>
              )}
            </div>
            <h2 className="mt-2 font-semibold text-foreground">{item.title}</h2>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{item.task}</p>
            <Link to={item.path} className="mt-4 self-start rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Göreve başla
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ExpertPreview;
