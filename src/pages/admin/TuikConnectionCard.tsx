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

interface TuikStructure {
  status: 'ok' | 'not_configured' | 'failed';
  errorCode?: string;
  summary?: {
    seriesCount: number;
    dimensions: Array<{ id: string; name: string; valueCount: number; sampleValues: Array<{ id: string; name: string }> }>;
    sampleSeries: Array<{ key: string; period: string | null; value: number | null }>;
  };
}

export function TuikConnectionCard() {
  const [result, setResult] = useState<TuikConnection | null>(null);
  const [checking, setChecking] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const [structureOf, setStructureOf] = useState<string | null>(null);
  const [structure, setStructure] = useState<TuikStructure | null>(null);
  const [loadingStructure, setLoadingStructure] = useState(false);

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

  const showStructure = async (flow: TuikDataflow) => {
    setStructureOf(flow.id);
    setStructure(null);
    setLoadingStructure(true);
    try {
      const res = await fetchWithAuth(`/api/admin/tuik/dataflows/${encodeURIComponent(flow.id)}?version=${encodeURIComponent(flow.version)}`);
      setStructure(res.ok ? await res.json() : { status: 'failed', errorCode: `HTTP_${res.status}` });
    } catch {
      setStructure({ status: 'failed', errorCode: 'TUIK_REQUEST_FAILED' });
    } finally {
      setLoadingStructure(false);
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
          <ul className="mt-2 space-y-2 text-muted-foreground">
            {result.indexDataflows.map(flow => (
              <li key={flow.id} className="flex flex-wrap items-center justify-between gap-2">
                <span><code>{flow.id}</code> (v{flow.version}): {flow.name}</span>
                <Button size="sm" variant="ghost" disabled={loadingStructure} onClick={() => void showStructure(flow)}>Yapıyı göster</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {structureOf && (
        <div className="mt-4 rounded-md border border-border p-3">
          <p className="font-medium"><code>{structureOf}</code></p>
          {loadingStructure && <p className="mt-2 text-muted-foreground">Yükleniyor...</p>}
          {structure?.status === 'failed' && <p className="mt-2 text-destructive">Okunamadı ({structure.errorCode}).</p>}
          {structure?.status === 'not_configured' && <p className="mt-2 text-destructive">Sunucuda TÜİK anahtarı tanımlı değil.</p>}
          {structure?.summary && (
            <div className="mt-2 space-y-3 text-muted-foreground">
              <p>{structure.summary.seriesCount} seri.</p>
              {structure.summary.dimensions.map(dimension => (
                <div key={dimension.id}>
                  <p><b>{dimension.id}</b> {dimension.name && `(${dimension.name})`}: {dimension.valueCount} değer</p>
                  <p>{dimension.sampleValues.map(value => `${value.id}${value.name ? ` = ${value.name}` : ''}`).join(' · ')}</p>
                </div>
              ))}
              <div>
                <p><b>Son değerler (örnek)</b></p>
                <ul>{structure.summary.sampleSeries.map(series => <li key={series.key}>{series.key}: {series.period ?? '-'} → {series.value ?? '-'}</li>)}</ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
