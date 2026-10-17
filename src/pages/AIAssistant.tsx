import { Sparkles, Bot, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export function AIAssistant() {
  return (
    <PageContainer>
      <PageHeader
        title="AI Strateji Asistanı"
        description="Serbest sohbet için altyapı henüz hazır değil. Bugün kullanılabilen AI destekli akış, teklif oluşturma sırasındaki kalem üretimidir."
        icon={Sparkles}
      />

      <Card className="bg-card border-border shadow-none">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Bot size={16} className="text-orange-500" /> Bugün çalışan AI özellikleri
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="p-5 bg-background rounded-2xl border border-border flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-foreground uppercase tracking-widest mb-1">Proje açıklamasından kalem üretimi</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Yeni teklif oluştururken proje açıklaması yazın; AI olası sektörü ve metraj kalemlerini önerir. Öneriler her zaman <Badge className="bg-amber-500/10 text-amber-500 border-none px-2 py-0 text-[9px] font-black align-middle">tahmini</Badge> olarak işaretlenir ve teklife eklenmeden önce sizin onayınızı bekler.</p>
            </div>
            <Link to="/app/quotes/new" className="shrink-0">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest h-10 px-5 gap-2">
                Yeni Teklif <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
            Serbest metin sohbeti (mevzuat sorgulama, rakip karşılaştırması, kârlılık projeksiyonu) şu anda desteklenmiyor. Bu özellikler hazır olduğunda burada gerçek sonuçlarla, hangi verinin AI tahmini hangisinin doğrulanmış olduğu açıkça belirtilerek sunulacak.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
