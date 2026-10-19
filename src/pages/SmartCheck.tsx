/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SmartCheckImportWorkspace } from '@/components/smartcheck/SmartCheckImportWorkspace';
import { PreBimFeasibilityPanel } from '@/components/smartcheck/PreBimFeasibilityPanel';

export function SmartCheck() {
  return (
    <PageContainer>
      <PageHeader
        title="Metraj İcmal & Daire Metrekareleri (SmartCheck)"
        description="IFC (.ifc), Excel (.xlsx/.csv) veya PDF/A (.pdf) dosyanızı yükleyin; çok katmanlı imalat icmallerini, boşluk (minha) düşümlerini ve daire metrekarelerini tek ekranda inceleyin."
      />

      <SmartCheckImportWorkspace />

      <PreBimFeasibilityPanel />
    </PageContainer>
  );
}
