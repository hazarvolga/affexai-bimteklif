import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { fetchWithAuth } from '../../lib/api';

interface TuikDataflow {
  id: string;
  version: string;
  name: string;
}

interface TuikConnection {
  status: 'connected' | 'not_configured' | 'failed';
  errorCode?: string;
  totalDataflows: number;
  indexDataflows: TuikDataflow[];
}

export function TuikConnectionCard() {
  const [result, setResult] = useState<TuikConnection | null>(null);
  const [checking, setChecking] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);

  const check = async () => {
    setChecking(true);
    setRequestFailed(false);
    try {
      const res = await fetchWithAuth('/api/admin/tuik/connection');
      if (!res.ok) throw new Error('TUIK_CONNECTION_UNAVAILABLE');
      setResult(await res.json());
    } catch {
      setResult(null);
      setRequestFailed(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">TÜİK veri bağlantısı</p>
          <p className="mt-1 text-muted-foreground">Sunucudaki anahtarın kabul edilip edilmediğini ve hangi endekslerin sunulduğunu gösterir. Hiçbir veri kaydetmez.</p>
        </div>
        <Button size="sm" variant="outline" disabled={checking} onClick={() => void check()}>{checking ? 'Deneniyor...' : 'Bağlantıyı dene'}</Button>
      </div>
      {requestFailed && <p className="mt-3 text-destructive">Kontrol çalıştırılamadı. Yeniden deneyin.</p>}
      {result?.status === 'not_configured' && <p className="mt-3 text-destructive">Sunucuda TÜİK anahtarı tanımlı değil.</p>}
      {result?.status === 'failed' && <p className="mt-3 text-destructive">Bağlantı kurulamadı ({result.errorCode}).</p>}
      {result?.status === 'connected' && (
        <div className="mt-3">
          <p>Bağlantı çalışıyor. Toplam {result.totalDataflows} veri akışından {result.indexDataflows.length} tanesi endeks.</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {result.indexDataflows.map(flow => <li key={flow.id}><code>{flow.id}</code> (v{flow.version}): {flow.name}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
