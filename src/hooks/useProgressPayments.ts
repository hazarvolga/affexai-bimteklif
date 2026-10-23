import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';

export interface ProgressContractSummary {
  id: string;
  contract_number: string;
  project_name: string;
  currency: 'TRY' | 'USD' | 'EUR';
  initial_amount: string;
  regime: string;
  status: string;
  period_count: number;
  approved_period_count: number;
}

export function useProgressPayments() {
  const [contracts, setContracts] = useState<ProgressContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetchWithAuth('/api/progress-payments/contracts');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Hakediş sözleşmeleri alınamadı.');
      setContracts(Array.isArray(payload) ? payload : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Hakediş sözleşmeleri alınamadı.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { contracts, loading, error, refresh };
}
