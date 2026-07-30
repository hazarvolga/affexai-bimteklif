import React from 'react';
import { BimIfcParser } from '@/components/bimplan/BimIfcParser';
import { useNavigate } from 'react-router-dom';

export function BimIfcParserPage() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <BimIfcParser 
        onTransferToQuote={(elements, summary) => {
          // Store extracted IFC elements in sessionStorage for quote creation
          sessionStorage.setItem('teklifpro_ifc_extracted', JSON.stringify({ elements, summary }));
          navigate('/app/quotes/new');
        }} 
      />
    </div>
  );
}

export default BimIfcParserPage;
