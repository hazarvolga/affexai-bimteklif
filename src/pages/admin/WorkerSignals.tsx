import React from 'react';
export type WorkerSignal = { kind: 'worker' | 'ifc-worker'; lastSeen: string | null; activeInstances: number; revision: string | null; revisionSource: 'build' | 'env' | null };
export function WorkerSignals({ signals }: { signals: WorkerSignal[] | null }) {
  return <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
    <h3 className="font-bold text-foreground">İşleyici süreç sinyalleri</h3>
    {!signals ? <p className="mt-2">Bilinmiyor: heartbeat kaynağına erişilemiyor veya doğrulanamadı.</p> : <div className="mt-2 grid gap-2 sm:grid-cols-2">{signals.map(signal => <div key={signal.kind}>
      <strong className="text-foreground">{signal.kind}</strong>: {signal.lastSeen === null ? 'Sinyal yok' : signal.activeInstances > 0 ? `${signal.activeInstances} son 90 sn içinde sinyal` : 'Süresi geçmiş'}
      <p>Son sinyal: {signal.lastSeen ? new Date(signal.lastSeen).toLocaleString('tr-TR') : 'Bilinmiyor'} · Bildirilen revizyon: {signal.revision ?? 'Bilinmiyor'}{signal.revisionSource ? ` (${signal.revisionSource})` : ''}</p>
    </div>)}</div>}
    <p className="mt-2 text-xs">Heartbeat süreç tarafından bildirilir; işleme sağlığını veya çalışan worker OCI imajını doğrulamaz. Worker OCI sürümü: doğrulanmadı. Yedek / geri yükleme: doğrulanmadı.</p>
  </section>;
}
