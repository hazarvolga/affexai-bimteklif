import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Building2 } from 'lucide-react';

export function TenantsList() {
  return (
    <PageContainer>
      <PageHeader title="Firmalar (Tenants)" description="Platformu kullanan tüm müşteri firmaları, abonelik durumlarını ve kota kullanımlarını yönetin." icon={Building2} />
      <div className="border border-zinc-800 bg-zinc-900/40 p-12 text-center rounded-xl">
        <h3 className="text-lg font-medium text-white">Firma Listesi</h3>
        <p className="mt-2 text-zinc-400">Yakında: Aboneliği bitenler, kotasını aşanlar ve detay sayfası yönetimi burada yer alacak.</p>
      </div>
    </PageContainer>
  );
}
