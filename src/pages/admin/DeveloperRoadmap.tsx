import { Link } from "react-router-dom";
import { Calculator, Download, Map as MapIcon, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button } from "../../components/ui/button";
import { fetchWithAuth } from "../../lib/api";
import { DocSectionView, DocSources, DocToc } from "./roadmap/DocBlocks";
import { ROADMAP_META, ROADMAP_SECTIONS, ROADMAP_SOURCES } from "./roadmap/roadmap-content";

export function DeveloperRoadmap() {
  const handleDownloadAllplanKit = async () => {
    try {
      const res = await fetchWithAuth("/api/smartcheck/epys-allplan-kit");
      if (!res.ok) throw new Error("Kit indirilemedi");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "allplan-2026-epys-kit-v1.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("ALLPLAN 2026 e-PYS Kiti v1 (SHA-256 mühürlü) indirildi.");
    } catch {
      toast.error("ALLPLAN 2026 e-PYS Kiti v1 indirilirken hata oluştu.");
    }
  };

  return (
    <PageContainer>
      <div className="print-doc">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white"><MapIcon className="text-indigo-400" size={26} />Geliştirici Yol Haritası</h1>
          <p className="mt-1 text-sm font-semibold text-zinc-200">{ROADMAP_META.title}</p>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">{ROADMAP_META.subtitle}</p>
          <p className="mt-2 text-xs text-zinc-500">Hazırlanma: {ROADMAP_META.preparedOn} · {ROADMAP_META.audience}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button type="button" onClick={handleDownloadAllplanKit} className="bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"><Download size={15} className="mr-2" />ALLPLAN 2026 e-PYS Kiti v1</Button>
          <Link to="/admin/roadmap/calculations">
            <Button type="button" className="bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"><Calculator size={15} className="mr-2" />Hesaplama Yöntemleri (uzman doğrulaması)</Button>
          </Link>
          <Button type="button" variant="outline" onClick={() => window.print()} className="border-zinc-700 bg-zinc-900 text-xs text-zinc-200"><Printer size={15} className="mr-2" />Yazdır / PDF</Button>
        </div>
      </header>
      <p className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">{ROADMAP_META.status}</p>
      <div className="space-y-5">
        <DocToc sections={ROADMAP_SECTIONS} />
        {ROADMAP_SECTIONS.map((section, index) => <DocSectionView key={section.id} section={section} index={index} />)}
        <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-base font-bold text-white">Kaynaklar</h2>
          <DocSources sources={ROADMAP_SOURCES} />
        </section>
      </div>
      </div>
    </PageContainer>
  );
}
