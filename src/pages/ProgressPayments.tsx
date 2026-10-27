import { AlertTriangle, FileCheck2, RefreshCw } from 'lucide-react';
import { useProgressPayments } from '@/hooks/useProgressPayments';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DECIMAL_MONEY = /^(-?)(0|[1-9]\d*)(?:\.(\d+))?$/u;

/** Formats database decimal strings without crossing the lossy JS number boundary. */
export function formatMoney(value: string, currency: string): string {
  const match = DECIMAL_MONEY.exec(value);
  if (!match) return '—';
  try {
    const negative = match[1] === '-';
    const integer = match[2];
    const suppliedFraction = match[3] ?? '';
    const formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency });
    const currencyDigits = formatter.resolvedOptions().minimumFractionDigits;
    const fraction = suppliedFraction.padEnd(currencyDigits, '0');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/gu, '.');
    const numeric = fraction ? `${grouped},${fraction}` : grouped;
    const template = formatter.formatToParts(negative ? -1n : 1n);
    const firstInteger = template.findIndex((part) => part.type === 'integer');
    let lastNumeric = firstInteger;
    while (lastNumeric + 1 < template.length && ['group', 'integer', 'decimal', 'fraction'].includes(template[lastNumeric + 1].type)) {
      lastNumeric += 1;
    }
    const prefix = template.slice(0, firstInteger).map((part) => part.value).join('');
    const suffix = template.slice(lastNumeric + 1).map((part) => part.value).join('');
    return `${prefix}${numeric}${suffix}`;
  } catch {
    return '—';
  }
}

export function ProgressPayments() {
  const { contracts, loading, error, refresh } = useProgressPayments();
  return (
    <PageContainer>
      <PageHeader
        title="Hakediş ve kesin hesap"
        description="Revizyonlu dönemler, ölçüm dayanakları ve maker-checker onayı için kontrollü pilot çalışma alanı."
        icon={FileCheck2}
        actions={<Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} /> Yenile</Button>}
      />
      <div className="mb-5 border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
          <p><strong>Teknik çalışma çıktısıdır.</strong> “Yeşil Defter çalışma cetveli” resmî belge değildir. OSKA/AMP hedef kabulü ve EKAP uzman incelemesi ayrı kanıt gerektirir.</p>
        </div>
      </div>
      {error && <div role="alert" className="border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {!error && !loading && contracts.length === 0 && <div className="border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Henüz hakediş sözleşmesi yok. Hakediş modülü pilot kapsamında açılır; sözleşme ve kalemler pilot kurulumunda tanımlanır.</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {contracts.map((contract) => (
          <Card key={contract.id} className="border-border">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div><CardTitle className="text-base">{contract.project_name}</CardTitle><p className="mt-1 font-mono text-xs text-muted-foreground">{contract.contract_number}</p></div>
              <Badge variant="outline">{contract.status}</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Başlangıç bedeli</p><p className="font-semibold">{formatMoney(contract.initial_amount, contract.currency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Rejim</p><p className="font-semibold">{contract.regime}</p></div>
              <div><p className="text-xs text-muted-foreground">Dönem</p><p className="font-semibold">{contract.period_count}</p></div>
              <div><p className="text-xs text-muted-foreground">Onaylı dönem</p><p className="font-semibold">{contract.approved_period_count}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
