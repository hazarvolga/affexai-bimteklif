/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, ChevronDown, ChevronUp, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchWithAuth } from '@/lib/api';
import { catalogPickable, searchCatalog, type CatalogSnapshot } from '@/lib/price-catalog-pick';

const LIST_LIMIT = 500;
const VISIBLE_ROWS = 50;

interface CompanyCatalogPickerProps {
  currency: string;
  onPick: (snapshot: CatalogSnapshot) => void;
}

function money(value: string, currency: string): string {
  return Number(value).toLocaleString('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 });
}

/** "Firma kataloğundan ekle": the company's approved prices, distinct from the platform reference pool (M-12.6). */
export function CompanyCatalogPicker({ currency, onPick }: CompanyCatalogPickerProps) {
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<CatalogSnapshot[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open || snapshots !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchWithAuth(`/api/pricing/snapshots?status=approved&limit=${LIST_LIMIT}`);
        if (!response.ok) throw new Error('catalogue unavailable');
        const body: unknown = await response.json();
        if (!Array.isArray(body)) throw new Error('unexpected catalogue response');
        if (!cancelled) setSnapshots(body as CatalogSnapshot[]);
      } catch {
        if (!cancelled) { setSnapshots([]); setLoadError(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [open, snapshots]);

  const pickable = useMemo(() => (snapshots ?? []).filter((snapshot) => catalogPickable(snapshot, currency)), [snapshots, currency]);
  const results = useMemo(() => searchCatalog(pickable, query), [pickable, query]);
  const hiddenCount = (snapshots?.length ?? 0) - pickable.length;

  return (
    <div className="mb-3 border border-border bg-card px-4 py-3" data-testid="company-catalog-picker">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpenCheck size={15} className="shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold text-foreground">Firma kataloğu</p>
            <p className="text-[11px] text-muted-foreground">Onayladığınız birim fiyatlardan satır ekleyin; satır fiyat kaydına bağlı kalır.</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen(!open)} data-testid="company-catalog-toggle" className="h-7 gap-1.5 font-mono text-xs">
          {open ? 'Kataloğu gizle' : 'Firma kataloğundan ekle'}
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {snapshots === null ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={13} className="animate-spin" /> Katalog yükleniyor…</p>
          ) : loadError ? (
            <p className="text-xs text-destructive">Katalog yüklenemedi. Sayfayı yenileyip tekrar deneyin.</p>
          ) : pickable.length === 0 ? (
            <p className="text-xs text-muted-foreground" data-testid="company-catalog-empty">
              Bu teklifin para biriminde ({currency}) kullanılabilir onaylı fiyat yok.{' '}
              <Link to="/app/fiyat-katalogu?kaynak=teklif" className="font-semibold text-primary underline">Fiyat kataloğuna fiyat ekleyin</Link>
            </p>
          ) : (
            <>
              <Input
                aria-label="Katalogda ara"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Poz no veya açıklama ile arayın"
                className="h-8 text-xs"
              />
              <ul className="max-h-72 divide-y divide-border overflow-y-auto border border-border" aria-label="Firma kataloğu fiyatları">
                {results.slice(0, VISIBLE_ROWS).map((snapshot) => (
                  <li key={snapshot.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs" data-catalog-row={snapshot.id}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{snapshot.description}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {snapshot.positionCode ? `${snapshot.positionCode} · ` : ''}{money(snapshot.amount, currency)} / {snapshot.unit} · KDV hariç
                      </span>
                    </span>
                    <Button type="button" size="sm" variant="outline" onClick={() => onPick(snapshot)} className="h-7 shrink-0 gap-1 font-mono text-xs">
                      <Plus size={12} /> Ekle
                    </Button>
                  </li>
                ))}
                {results.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">Aramanızla eşleşen fiyat yok.</li>}
              </ul>
              {results.length > VISIBLE_ROWS && (
                <p className="text-[11px] text-muted-foreground">İlk {VISIBLE_ROWS} sonuç gösteriliyor; aramayı daraltın.</p>
              )}
            </>
          )}
          {hiddenCount > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {hiddenCount} fiyat listelenmedi: süresi dolmuş, KDV durumu belirsiz ya da para birimi farklı.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
