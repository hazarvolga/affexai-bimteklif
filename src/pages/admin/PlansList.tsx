import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Package } from 'lucide-react';

export function PlansList() {
  return (
    <PageContainer>
      <PageHeader title="Paket Yönetimi" description="SaaS platformunuzdaki abonelik paketlerini, aylık teklif kotalarını ve fiyatlandırmaları yapılandırın." icon={Package} />
      <div className="border border-zinc-800 bg-zinc-900/40 p-12 text-center rounded-xl">
        <h3 className="text-lg font-medium text-white">Dinamik Paketler</h3>
        <p className="mt-2 text-zinc-400">Yakında: Başlangıç, Profesyonel vb. paketlerin sınırlarını koddan bağımsız olarak buradan belirleyebileceksiniz.</p>
      </div>
    </PageContainer>
  );
}
