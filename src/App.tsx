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
import { PublicAcademy } from '@/pages/PublicAcademy';
import { PublicAcademyDetail } from '@/pages/PublicAcademyDetail';
import { CompleteAcademyContent } from '@/pages/CompleteAcademyContent';
import { PublicAllplanTrack } from '@/pages/PublicAllplanTrack';
import { PublicAllplanPath } from '@/pages/PublicAllplanPath';
import { PublicAllplanLesson } from '@/pages/PublicAllplanLesson';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Toaster } from '@/components/ui/sonner';
import { SmartCheck } from '@/pages/SmartCheck';
import { SmartCheckDemo } from '@/pages/SmartCheckDemo';
import { Academy } from '@/pages/Academy';
import { AllplanAcademy } from '@/pages/AllplanAcademy';
import { LessonViewerPage } from '@/pages/LessonViewerPage';
import { PilotApplication } from '@/pages/PilotApplication';
import { PilotApplications } from '@/pages/PilotApplications';
import { SmartCheckDemoProvider } from '@/smartcheck/SmartCheckDemoContext';

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <SmartCheckDemoProvider>
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/about" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/pricing" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/features" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/academy" element={<PublicAcademy />} />
      <Route path="/academy/complete" element={<CompleteAcademyContent />} />
      <Route path="/academy/allplan" element={<PublicAllplanTrack />} />
      <Route path="/academy/allplan/:pathSlug" element={<PublicAllplanPath />} />
      <Route path="/academy/allplan/lesson/:lessonSlug" element={<PublicAllplanLesson />} />
      <Route path="/academy/:slug" element={<PublicAcademyDetail />} />
      <Route path="/pilot" element={<PilotApplication />} />
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
          <Route path="pilot-applications" element={<PilotApplications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="smartcheck" element={<SmartCheck />} />
          <Route path="smartcheck/checks/demo" element={<SmartCheckDemo />} />
          <Route path="academy" element={<Academy />} />
          <Route path="academy/content/:slug" element={<LessonViewerPage />} />
          <Route path="academy/allplan" element={<AllplanAcademy />} />
          <Route path="academy/allplan/content/:slug" element={<LessonViewerPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </SmartCheckDemoProvider>
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
