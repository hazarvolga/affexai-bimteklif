/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Shell } from '@/components/layout/Shell';
import { Dashboard } from '@/pages/Dashboard';
import { Quotes } from '@/pages/Quotes';
import { CreateQuote } from '@/pages/CreateQuote';
import { QuoteDetail } from '@/pages/QuoteDetail';
import { Clients } from '@/pages/Clients';
import { Settings } from '@/pages/Settings';
import { Regulations } from '@/pages/Regulations';
import { CRM } from '@/pages/CRM';
import { DealDetail } from '@/pages/DealDetail';
import { AIAssistant } from '@/pages/AIAssistant';
import { Profitability } from '@/pages/Profitability';
import { Billing } from '@/pages/Billing';
import { AcceptInvite } from '@/pages/AcceptInvite';
import { VerifyEmail } from '@/pages/VerifyEmail';
import { LandingPage } from '@/pages/LandingPage';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Toaster } from '@/components/ui/sonner';

function AppRoutes() {
  const navigate = useNavigate();
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage onGetStarted={() => navigate('/register')} />} />
      <Route path="/about" element={<LandingPage onGetStarted={() => navigate('/register')} />} />
      <Route path="/pricing" element={<LandingPage onGetStarted={() => navigate('/register')} />} />
      <Route path="/features" element={<LandingPage onGetStarted={() => navigate('/register')} />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />

      {/* Protected App Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="quotes/new" element={<CreateQuote />} />
          <Route path="quotes/:id" element={<QuoteDetail />} />
          <Route path="clients" element={<Clients />} />
          <Route path="regulations" element={<Regulations />} />
          <Route path="crm" element={<CRM />} />
          <Route path="crm/deals/:id" element={<DealDetail />} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="profitability" element={<Profitability />} />
          <Route path="billing" element={<Billing />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </Router>
  );
}
