import React from 'react';
import { BimIfcParser } from '@/components/bimplan/BimIfcParser';
import { useNavigate } from 'react-router-dom';

export function BimIfcParserPage() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <BimIfcParser 
        onTransferToQuote={(elements, summary) => {
          const evidenceElementCount = elements.filter((element) => element.quantitySource === 'qto' || element.quantitySource === 'property').length;
          // Store only the compact transfer payload needed by quote creation.
          // Full element lists can be large for real IFC files and are not used by the legacy quote import path.
          sessionStorage.setItem('teklifpro_ifc_extracted', JSON.stringify({
            source: 'ifc-parser',
            transferredAt: new Date().toISOString(),
            evidenceElementCount,
            summary,
          }));
          navigate('/app/quotes/new');
        }} 
      />
    </div>
  );
}

export default BimIfcParserPage;
