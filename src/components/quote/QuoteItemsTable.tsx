/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { QuoteItem } from '@/types';

type Item = Partial<QuoteItem>;

interface QuoteItemsTableProps {
  items: readonly Item[];
  currency: string;
  onUpdate: (id: string, updates: Partial<QuoteItem>) => void;
  onRemove: (id: string) => void;
}

export type QuoteTableView = 'basic' | 'detailed';

const VIEW_KEY = 'bimmetraj:quote-table-view:v1';

const COST_CATEGORIES: ReadonlyArray<[NonNullable<QuoteItem['costCategory']>, string]> = [
  ['material', 'Malzeme'], ['labor', 'İşçilik'], ['subcontractor', 'Taşeron'], ['logistics', 'Lojistik'], ['overhead', 'Genel Gider'],
];

const cellInput = 'bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-xs tabular-nums';
const headClass = 'text-muted-foreground font-mono text-xs uppercase py-3';
const detailLabel = 'flex min-w-0 flex-col gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground';
const detailInput = 'h-8 w-full bg-background border-border text-xs font-mono tabular-nums normal-case tracking-normal';

function readView(): QuoteTableView {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'detailed' ? 'detailed' : 'basic';
  } catch {
    return 'basic';
  }
}

function percentInput(value: string): number {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function formatMoney(value: number | undefined, currency: string): string {
  return `${(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/** A line needs its cost to show a margin; the row says so instead of hiding the gap behind a closed detail. */
export function missingCost(item: Item): boolean {
  return item.costUnitPrice === null || item.costUnitPrice === undefined;
}

/**
 * Teklif kalemleri tablosu (marka.md M-12.5). Temel görünümde beş sütun; kategori, maliyet, zayiat, iskonto
 * ve KDV satır ayrıntısında. Ayrıntılı görünüm bütün sütunları tek tabloda gösterir; seçim tarayıcıda hatırlanır.
 */
export function QuoteItemsTable({ items, currency, onUpdate, onRemove }: QuoteItemsTableProps) {
  const [view, setView] = useState<QuoteTableView>(readView);
  const [openRow, setOpenRow] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view);
    } catch {
      // Blocked storage: the view is just not remembered.
    }
  }, [view]);

  const detailed = view === 'detailed';

  const descriptionCell = (item: Item) => (
    <TableCell className="pl-5 py-2.5 sticky left-0 z-10 bg-card group-hover:bg-muted/80 border-r border-border transition-colors">
      <Input
        aria-label="İş kalemi"
        value={item.description}
        onChange={(e) => onUpdate(item.id!, { description: e.target.value })}
        className="bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-xs text-foreground placeholder:text-muted-foreground/60 font-medium"
        placeholder="Burada yeni bir iş kalemi oluşturun..."
      />
      {item.priceSnapshotId && (
        <span className="mt-0.5 block font-mono text-[10px] text-primary" data-catalog-bound={item.id}>
          Firma kataloğu{item.sourceReference ? ` · ${item.sourceReference}` : ''}
        </span>
      )}
    </TableCell>
  );

  const categorySelect = (item: Item, className: string) => (
    <select
      aria-label="Maliyet kategorisi"
      value={item.costCategory || 'material'}
      onChange={(e) => onUpdate(item.id!, { costCategory: e.target.value as QuoteItem['costCategory'] })}
      className={className}
    >
      {COST_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );

  const removeButton = (item: Item) => (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Kalemi sil"
      onClick={() => onRemove(item.id!)}
      className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 focus-visible:opacity-100 transition-opacity"
    >
      <Trash2 size={14} />
    </Button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div role="radiogroup" aria-label="Tablo görünümü" className="inline-flex border border-border text-[11px] font-mono">
          {(['basic', 'detailed'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={view === option}
              data-table-view={option}
              onClick={() => setView(option)}
              className={`px-3 py-1 ${view === option ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
            >
              {option === 'basic' ? 'Temel' : 'Ayrıntılı'}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {detailed ? 'Bütün sütunlar görünür.' : 'Maliyet, zayiat, iskonto ve KDV satırın "Ayrıntı" bölümünde.'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <Table className={detailed ? 'min-w-[980px]' : 'min-w-[620px]'} data-testid="quote-items-table" data-view={view}>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border">
              <TableHead className={`w-[40%] min-w-[200px] sticky left-0 z-10 bg-card border-r border-border pl-5 ${headClass}`}>İş Kalemi</TableHead>
              {detailed && <TableHead className={`text-center ${headClass}`}>Kategori</TableHead>}
              <TableHead className={`text-center ${headClass}`}>Birim</TableHead>
              <TableHead className={`text-center ${headClass}`}>Miktar</TableHead>
              <TableHead className={`text-right ${headClass}`}>Birim Fiyat</TableHead>
              {detailed && <>
                <TableHead className={`text-right ${headClass}`}>Maliyet Birim</TableHead>
                <TableHead className={`text-right ${headClass}`}>Zayiat %</TableHead>
                <TableHead className={`text-right ${headClass}`}>İsk. %</TableHead>
                <TableHead className={`text-right ${headClass}`}>KDV %</TableHead>
              </>}
              <TableHead className={`text-right pr-5 ${headClass}`}>Tutar (KDV hariç)</TableHead>
              <TableHead className="w-[96px] py-3"><span className="sr-only">İşlemler</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const open = !detailed && openRow === item.id;
              const discount = Number(item.discountPercent ?? 0);
              return (
                <React.Fragment key={item.id}>
                  <TableRow className="border-border/60 group hover:bg-muted/30 transition-colors" data-quote-row={item.id}>
                    {descriptionCell(item)}
                    {detailed && (
                      <TableCell className="text-center py-2.5">
                        {categorySelect(item, 'bg-background border border-border rounded px-1.5 py-1 text-[11px] font-mono text-foreground focus:border-primary')}
                      </TableCell>
                    )}
                    <TableCell className="text-center py-2.5">
                      <Input aria-label="Birim" value={item.unit} onChange={(e) => onUpdate(item.id!, { unit: e.target.value })} className={`${cellInput} text-center font-mono text-muted-foreground uppercase`} />
                    </TableCell>
                    <TableCell className="text-center py-2.5">
                      <Input aria-label="Miktar" type="number" value={item.quantity} onChange={(e) => onUpdate(item.id!, { quantity: Number(e.target.value) })} className={`${cellInput} text-center font-mono text-foreground`} />
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <Input aria-label="Birim fiyat" type="number" value={item.unitPrice} onChange={(e) => onUpdate(item.id!, { unitPrice: Number(e.target.value) })} className={`${cellInput} text-right font-mono text-foreground font-semibold`} />
                    </TableCell>
                    {detailed && <>
                      <TableCell className="text-right py-2.5">
                        <Input aria-label="Maliyet birim fiyatı" type="number" min="0" placeholder="Gerekli" value={item.costUnitPrice ?? ''} onChange={(e) => onUpdate(item.id!, { costUnitPrice: e.target.value === '' ? null : Number(e.target.value) })} className={`${cellInput} text-right font-mono text-amber-700 dark:text-amber-300 font-semibold placeholder:text-muted-foreground/60`} />
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <Input aria-label="Zayiat yüzdesi" type="number" min="0" value={item.wastePercent ?? 0} onChange={(e) => onUpdate(item.id!, { wastePercent: Number(e.target.value) })} className={`${cellInput} text-right font-mono text-muted-foreground`} />
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <Input aria-label="İskonto yüzdesi" type="number" min="0" max="100" value={item.discountPercent ?? 0} onChange={(e) => onUpdate(item.id!, { discountPercent: percentInput(e.target.value) })} className={`${cellInput} text-right font-mono text-orange-600 dark:text-orange-300 font-semibold`} />
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <Input aria-label="KDV yüzdesi" type="number" min="0" max="100" value={item.vatPercent ?? 20} onChange={(e) => onUpdate(item.id!, { vatPercent: percentInput(e.target.value) })} className={`${cellInput} text-right font-mono text-muted-foreground`} />
                      </TableCell>
                    </>}
                    <TableCell className="text-right font-semibold text-foreground pr-5 py-2.5 font-mono text-xs tabular-nums">
                      {formatMoney(item.total, currency)}
                      {!detailed && discount > 0 && <span className="block text-[10px] font-normal text-orange-600 dark:text-orange-300">%{discount.toLocaleString('tr-TR')} iskonto</span>}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center justify-end gap-1 pr-2">
                        {!detailed && (
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={`${item.description || 'Kalem'} ayrıntıları`}
                            data-row-detail-toggle={item.id}
                            onClick={() => setOpenRow(open ? null : item.id!)}
                            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${missingCost(item) ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}
                            title={missingCost(item) ? 'Maliyet birim fiyatı girilmedi; marj hesaplanmaz.' : undefined}
                          >
                            {missingCost(item) ? 'Maliyet eksik' : 'Ayrıntı'}
                            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                        {removeButton(item)}
                      </div>
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow className="border-border/60 bg-muted/20" data-row-detail={item.id}>
                      <TableCell colSpan={6} className="px-5 py-3">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                          <label className={detailLabel}>
                            Kategori
                            {categorySelect(item, 'block h-8 w-full border border-border bg-background px-2 text-xs font-mono normal-case tracking-normal text-foreground')}
                          </label>
                          <label className={detailLabel}>
                            Maliyet fiyatı
                            <Input aria-label="Maliyet birim fiyatı" type="number" min="0" placeholder="Gerekli" value={item.costUnitPrice ?? ''} onChange={(e) => onUpdate(item.id!, { costUnitPrice: e.target.value === '' ? null : Number(e.target.value) })} className={detailInput} />
                          </label>
                          <label className={detailLabel}>
                            Zayiat %
                            <Input aria-label="Zayiat yüzdesi" type="number" min="0" value={item.wastePercent ?? 0} onChange={(e) => onUpdate(item.id!, { wastePercent: Number(e.target.value) })} className={detailInput} />
                          </label>
                          <label className={detailLabel}>
                            İskonto %
                            <Input aria-label="İskonto yüzdesi" type="number" min="0" max="100" value={item.discountPercent ?? 0} onChange={(e) => onUpdate(item.id!, { discountPercent: percentInput(e.target.value) })} className={detailInput} />
                          </label>
                          <label className={detailLabel}>
                            KDV %
                            <Input aria-label="KDV yüzdesi" type="number" min="0" max="100" value={item.vatPercent ?? 20} onChange={(e) => onUpdate(item.id!, { vatPercent: percentInput(e.target.value) })} className={detailInput} />
                          </label>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
