/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SmartCheckImportWorkspace } from '@/components/smartcheck/SmartCheckImportWorkspace';

export function SmartCheck() {
  const location = useLocation();
  const navigate = useNavigate();
  // Old links pointed at the panel on this page; it now has its own screen (M-13.3).
  useEffect(() => {
    if (location.hash === '#pre-bim-feasibility') navigate('/app/arsa-fizibilitesi', { replace: true });
  }, [location.hash, navigate]);

  return (
    <PageContainer>
      <PageHeader
        title="Metraj İcmal & Daire Metrekareleri (SmartCheck)"
        description="IFC (.ifc), Excel (.xlsx/.csv) veya PDF/A (.pdf) dosyanızı yükleyin; çok katmanlı imalat icmallerini, boşluk (minha) düşümlerini ve daire metrekarelerini tek ekranda inceleyin."
      />

      <SmartCheckImportWorkspace />

      <Link
        to="/app/arsa-fizibilitesi"
        data-testid="feasibility-link"
        className="mt-8 flex items-center gap-3 border border-border bg-card p-4 text-sm text-foreground hover:border-primary/60"
      >
        <Building2 size={18} className="shrink-0 text-primary" aria-hidden="true" />
        <span>
          <span className="font-semibold">Henüz IFC veya metrajınız yok mu?</span>{' '}
          <span className="text-muted-foreground">İmar değerlerinizle arsa ön fizibilitesi ve kat karşılığı hesabı yapın →</span>
        </span>
      </Link>
    </PageContainer>
  );
}
