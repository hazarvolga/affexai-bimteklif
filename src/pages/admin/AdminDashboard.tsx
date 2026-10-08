import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { LayoutDashboard } from 'lucide-react';

export function AdminDashboard() {
  return (
    <PageContainer>
      <PageHeader title="Platform Genel Bakış" description="TeklifPro platformunun genel durumunu, aktif firmaları ve gelir metriklerini takip edin." icon={LayoutDashboard} />
      <div className="border border-indigo-500/20 bg-indigo-500/5 p-12 text-center rounded-xl">
        <h3 className="text-lg font-medium text-white">Süper Admin Dashboard</h3>
        <p className="mt-2 text-zinc-400">Yakında: MRR grafikleri, paket kullanım oranları ve kota doluluk uyarıları burada yer alacak.</p>
      </div>
    </PageContainer>
  );
}
