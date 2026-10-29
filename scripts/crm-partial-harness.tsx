import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../src/hooks/useAuth';
import { CRM } from '../src/pages/CRM';
import '../src/index.css';
function Fixture() {
  const [companyId, setCompanyId] = useState('company-a');
  return <AuthContext.Provider value={{ user: { id: 'u', email: 'fixture@example.test', fullName: 'Test', emailVerified: '2026-01-01' }, company: { id: companyId, name: companyId, defaultCurrency: 'TRY', defaultVatRate: 20 }, role: 'owner', accountType: 'workspace', learnerProfile: null, loading: false, isDemoMode: false, login() {}, logout() {}, exitImpersonation() {} } as React.ContextType<typeof AuthContext>}>
    <button data-testid="switch-company" onClick={() => setCompanyId('company-b')}>Switch company</button>
    <MemoryRouter><CRM /></MemoryRouter>
  </AuthContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
