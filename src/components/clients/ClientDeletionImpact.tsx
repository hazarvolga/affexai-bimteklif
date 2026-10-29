import React, { useRef, useState } from 'react';
import { z } from 'zod';
import { fetchWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const impactSchema = z.object({
  clientId: z.string(),
  counts: z.object({ quotations: z.number().int().nonnegative(), revisions: z.number().int().nonnegative(), deals: z.number().int().nonnegative(), activities: z.number().int().nonnegative() }),
  limitations: z.array(z.string()),
});
type Impact = z.infer<typeof impactSchema>;

/** A read-only relationship inventory, not a deletion request or a complete data inventory. */
export function ClientDeletionImpact({ clientId }: { clientId: string }) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'forbidden'>('idle');
  const pending = useRef(false);

  async function loadImpact() {
    if (pending.current) return;
    pending.current = true;
    setStatus('loading');
    setImpact(null);
    try {
      const response = await fetchWithAuth(`/api/clients/${encodeURIComponent(clientId)}/deletion-impact`);
      if (response.status === 403) { setStatus('forbidden'); return; }
      if (!response.ok) throw new Error('Preview unavailable');
      const parsed = impactSchema.safeParse(await response.json());
      if (!parsed.success || parsed.data.clientId !== clientId) throw new Error('Invalid preview');
      setImpact(parsed.data);
      setStatus('idle');
    } catch {
      setStatus('error');
    } finally {
      pending.current = false;
    }
  }

  return (
    <Card className="bg-card border-border" data-testid="client-deletion-impact">
      <CardContent className="p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Veri silme etki önizlemesi</h2>
        <p className="text-sm text-muted-foreground">Bu önizleme, müşteri kaydıyla doğrudan ilişkili bazı kayıtların sayısını gösterir. Hiçbir veriyi silmez ve silme talebi oluşturmaz.</p>
        <Button type="button" variant="outline" onClick={() => void loadImpact()} disabled={status === 'loading'}>
          {status === 'loading' ? 'Önizleme yükleniyor…' : impact ? 'Önizlemeyi yenile' : 'İlişkili kayıtları göster'}
        </Button>
        <div aria-live="polite">
          {status === 'loading' && <p className="text-sm text-muted-foreground">İlişkili kayıtlar hesaplanıyor…</p>}
          {status === 'forbidden' && <p role="alert" className="text-sm text-destructive">Bu önizlemeyi görüntüleme yetkiniz bulunmuyor.</p>}
          {status === 'error' && <p role="alert" className="text-sm text-destructive">Önizleme yüklenemedi. Tekrar deneyin.</p>}
          {impact && <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt>Teklifler</dt><dd className="font-semibold">{impact.counts.quotations}</dd></div>
              <div><dt>Teklif revizyonları</dt><dd className="font-semibold">{impact.counts.revisions}</dd></div>
              <div><dt>Fırsatlar</dt><dd className="font-semibold">{impact.counts.deals}</dd></div>
              <div><dt>Fırsat etkinlikleri</dt><dd className="font-semibold">{impact.counts.activities}</dd></div>
            </dl>
            <p className="text-sm text-muted-foreground">Teklif sayısı revizyonları da içerir; bu sayıları toplamayın. Sayılar alındıkları andaki doğrudan ilişkileri gösterir.</p>
          </div>}
        </div>
        <p className="text-sm text-muted-foreground">Serbest metinlerdeki bilgiler, dosyalar, denetim kayıtları, yedekler, dış hizmetler ve doğrudan müşteri bağlantısı bulunmayan aday kayıtları bu önizlemede hesaplanmaz. Diğer firmalardaki olası ilişkiler de hesaplanmaz. Bu alanların durumu bilinmiyor; sayılar tüm bağımlılıkları veya silmenin mümkün olduğunu göstermez.</p>
        <p className="text-sm text-muted-foreground">Veri başvuruları için <a href="mailto:info@bimmetraj.com" className="underline text-primary break-all">info@bimmetraj.com</a> adresine ulaşabilirsiniz.</p>
      </CardContent>
    </Card>
  );
}
