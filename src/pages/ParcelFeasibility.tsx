/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { PreBimFeasibilityPanel } from '@/components/smartcheck/PreBimFeasibilityPanel';

/** Arsa ön fizibilitesi kendi ekranında; IFC/Excel yükleme ekranından ayrıldı (marka.md M-13.3). */
export function ParcelFeasibility() {
  return (
    <PageContainer>
      <PageHeader
        title="Arsa Ön Fizibilitesi"
        description="Projeniz veya IFC dosyanız yokken imar değerlerinizle kat karşılığı ön hesabı yapın. Tüm değerleri siz girersiniz; varsayılan veya piyasa ortalaması kullanılmaz."
      />
      <PreBimFeasibilityPanel />
    </PageContainer>
  );
}

export default ParcelFeasibility;
