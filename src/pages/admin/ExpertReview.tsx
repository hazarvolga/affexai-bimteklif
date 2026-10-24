import { ClipboardCheck, ExternalLink, FileCheck2, Gauge, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";

const DISCIPLINES = [
  ["STR", "TS 500 / TS 708, betonarme QTO, donatı ve kesişim düşümleri", "/app/ifc-parser"],
  ["ARC", "İmar, mahal, açıklık, katman ve net/brüt alan kontrolleri", "/app/ifc-parser"],
  ["MEP", "Mekanik/elektrik sınıf, ölçü, bağlantı ve birim doğrulaması", "/app/ifc-parser"],
  ["COST", "Poz, birim, fiyat, minha, eskalasyon ve hakediş zinciri", "/app/dosyadan-teklif-demo"],
  ["Vergi", "KDV, kat karşılığı ve işlem tarihi/statü sınırları", "/admin/roadmap/calculations"],
  ["İhale", "4734/4735, ADT, fiyat farkı ve kapsam dışı durumlar", "/admin/roadmap/calculations"],
] as const;

const GATES = [
  ["1", "Dosya ve kaynak kabulü", "İzin, üretici/sürüm, SHA-256, PII ve kullanım kapsamı kaydedilmeden dosya teste alınmaz."],
  ["2", "Üçlü senaryo", "Her disiplin için normal, sınır ve eksik/hatalı örnek; uzman beklenen sonucu sistem çıktısından bağımsız üretir."],
  ["3", "Performans ve işletim", "Dosya boyutu, süre, p95, RSS/heap, CPU, eşzamanlı tenant, queue latency, retry ve limit davranışı ölçülür."],
  ["4", "Sonuç karşılaştırması", "Kalem, birim, yuvarlama, fark yüzdesi, önem seviyesi ve kapsam dışı durumlar kaydedilir."],
  ["5", "Karar ve imza", "Uzman kabul, şartlı kabul veya ret verir; bağımsızlık, yetkinlik ve açık şartlar manifestte imzalanır."],
] as const;

export function ExpertReview() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <header className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 text-amber-300" size={24} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Uzman sistem deneme ve kabul rehberi</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Bu sayfa bağımsız uzman incelemesini hazırlar. Yerel test, sentetik dosya veya uygulama çıktısı uzman imzası yerine geçmez; bu sayfada kabul verilmiş gösterilmez.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4"><FileCheck2 className="text-sky-300" size={20} /><h2 className="mt-2 font-semibold">Kaynak kanıtı</h2><p className="mt-1 text-xs text-muted-foreground">İzinli dosya, kaynak sürümü, hash ve PII kararı.</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><Gauge className="text-emerald-300" size={20} /><h2 className="mt-2 font-semibold">Ölçüm kanıtı</h2><p className="mt-1 text-xs text-muted-foreground">Gerçek UI, hedef VPS, p95, bellek ve kuyruk ölçümü.</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><ClipboardCheck className="text-violet-300" size={20} /><h2 className="mt-2 font-semibold">Karar kanıtı</h2><p className="mt-1 text-xs text-muted-foreground">Bağımsız hesap, fark kaydı, şart ve imza.</p></div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Zorunlu kabul kapıları</h2>
          <div className="mt-4 space-y-3">{GATES.map(([number, title, text]) => <div key={number} className="flex gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-200">{number}</span><div><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{text}</p></div></div>)}</div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Disiplin çalışma alanları</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{DISCIPLINES.map(([discipline, scope, href]) => <div key={discipline} className="rounded-lg border border-border p-4"><p className="font-semibold">{discipline}</p><p className="mt-1 text-sm text-muted-foreground">{scope}</p><Link className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-300 hover:underline" to={href}>İlgili çalışma ekranını aç <ExternalLink size={13} /></Link></div>)}</div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Deneme sırası</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Koordinatör dosya manifestini, commit/build kimliğini ve uzman kapsamını sabitler.</li>
            <li>Uzman üç senaryoyu bağımsız hesaplar; sistem sonucunu ancak kendi beklenen çıktısını kaydettikten sonra görür.</li>
            <li>IFC, ExcelJS, PDF ve 3D akışları gerçek UI üzerinden; eşzamanlı tenant ve queue akışı ölçüm formuyla çalıştırılır.</li>
            <li>Limit, timeout, retry, worker yeniden başlatma ve Sentry/log/alert teslimi gözlemlenir.</li>
            <li>Uzman farkları karar manifestine yazar ve imzalı kabul/şartlı kabul/ret verir.</li>
          </ol>
        </section>

        <section className="rounded-xl border border-red-500/30 bg-red-500/[0.05] p-5 text-sm leading-relaxed text-red-100">
          <strong>Deploy kapısı:</strong> T43 (izole tam suite/E2E), T44 (canary, restore, rollback), T45 (gerçek dosya, p95, VPS, concurrency ve observability) ile uzman imzaları tamamlanmadan production deploy kabul edilmez. Bu sayfa pilot/staging denemesini kolaylaştırır; tek başına production onayı değildir.
        </section>

        <p className="text-xs text-muted-foreground">Ayrıntılı dosya kökeni, bağımsızlık ve imza alanları: <code>docs/audits/phase-0/EXPERT_REVIEW_DOSSIER_2026-10-23.md</code>. Hesap yöntemleri: <Link className="text-indigo-300 hover:underline" to="/admin/roadmap/calculations">/admin/roadmap/calculations</Link>.</p>
      </div>
    </PageContainer>
  );
}
