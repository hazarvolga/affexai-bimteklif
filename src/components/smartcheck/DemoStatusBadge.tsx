/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { DemoFinding } from '@/smartcheck/demoData';

const STATUS: Record<DemoFinding['status'], { label: string; className: string }> = {
  open: { label: 'Açık', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  in_progress: { label: 'Düzeltildi, kontrol bekliyor', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  resolved: { label: 'Çözüldü', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
};

export function DemoStatusBadge({ status }: { status: DemoFinding['status'] }) {
  const { label, className } = STATUS[status];
  return <Badge className={`shrink-0 px-1.5 py-0.5 font-mono text-[11px] ${className}`}>{label}</Badge>;
}
