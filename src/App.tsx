/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Shell } from '@/components/layout/Shell';
import { Toaster } from '@/components/ui/sonner';
import { SmartCheckDemoProvider } from '@/smartcheck/SmartCheckDemoContext';

const page = <T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T) => lazy(async () => ({ default: (await loader())[name] as ComponentType<any> }));
const Dashboard = page(() => import('@/pages/Dashboard'), 'Dashboard');
const Quotes = page(() => import('@/pages/Quotes'), 'Quotes');
const CreateQuote = page(() => import('@/pages/CreateQuote'), 'CreateQuote');
const QuoteDetail = page(() => import('@/pages/QuoteDetail'), 'QuoteDetail');
const Clients = page(() => import('@/pages/Clients'), 'Clients');
const Settings = page(() => import('@/pages/Settings'), 'Settings');
const Regulations = page(() => import('@/pages/Regulations'), 'Regulations');
const MarketIntelligence = page(() => import('@/pages/MarketIntelligence'), 'MarketIntelligence');
const PilotEvidence = page(() => import('@/pages/PilotEvidence'), 'PilotEvidence');
const CRM = page(() => import('@/pages/CRM'), 'CRM');
const DealDetail = page(() => import('@/pages/DealDetail'), 'DealDetail');
const AIAssistant = page(() => import('@/pages/AIAssistant'), 'AIAssistant');
const Profitability = page(() => import('@/pages/Profitability'), 'Profitability');
const Billing = page(() => import('@/pages/Billing'), 'Billing');
const AcceptInvite = page(() => import('@/pages/AcceptInvite'), 'AcceptInvite');
const VerifyEmail = page(() => import('@/pages/VerifyEmail'), 'VerifyEmail');
const LandingPage = page(() => import('@/pages/LandingPage'), 'LandingPage');
const PublicAcademy = page(() => import('@/pages/PublicAcademy'), 'PublicAcademy');
const PublicAcademyDetail = page(() => import('@/pages/PublicAcademyDetail'), 'PublicAcademyDetail');
const CompleteAcademyContent = page(() => import('@/pages/CompleteAcademyContent'), 'CompleteAcademyContent');
const AllplanAccessGate = page(() => import('@/pages/AllplanAccessGate'), 'AllplanAccessGate');
const Login = page(() => import('@/pages/Login'), 'Login');
const Register = page(() => import('@/pages/Register'), 'Register');
const LegalPage = page(() => import('@/pages/LegalPage'), 'LegalPage');
const PasswordRecovery = page(() => import('@/pages/PasswordRecovery'), 'PasswordRecovery');
const SmartCheck = page(() => import('@/pages/SmartCheck'), 'SmartCheck');
const SmartCheckDemo = page(() => import('@/pages/SmartCheckDemo'), 'SmartCheckDemo');
const Academy = page(() => import('@/pages/Academy'), 'Academy');
const AcademyActivation = page(() => import('@/pages/AcademyActivation'), 'AcademyActivation');
const AllplanAcademy = page(() => import('@/pages/AllplanAcademy'), 'AllplanAcademy');
const LessonViewerPage = page(() => import('@/pages/LessonViewerPage'), 'LessonViewerPage');
const ProtectedAllplanLessonPage = page(() => import('@/pages/ProtectedAllplanLessonPage'), 'ProtectedAllplanLessonPage');
const PilotApplication = page(() => import('@/pages/PilotApplication'), 'PilotApplication');
const PilotApplications = page(() => import('@/pages/PilotApplications'), 'PilotApplications');
const BimStandardsPage = page(() => import('@/pages/BimStandardsPage'), 'default');
const BimGlossaryPage = page(() => import('@/pages/BimGlossaryPage'), 'default');
const AcademyCertificatesPage = page(() => import('@/pages/AcademyCertificatesPage'), 'default');
const AcademyProfilePage = page(() => import('@/pages/AcademyProfilePage'), 'default');
const AcademyCADPage = page(() => import('@/pages/AcademyCADPage'), 'default');
const AcademyExamPage = page(() => import('@/pages/AcademyExamPage'), 'default');
const BimIfcParserPage = page(() => import('@/pages/BimIfcParserPage'), 'default');

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <SmartCheckDemoProvider>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">Yükleniyor…</div>}><Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/about" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/pricing" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/features" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/academy" element={<PublicAcademy />} />
      <Route path="/academy/complete" element={<CompleteAcademyContent />} />
      <Route path="/academy/allplan" element={<AllplanAccessGate />} />
      <Route path="/academy/allplan/:pathSlug" element={<AllplanAccessGate />} />
      <Route path="/academy/allplan/lesson/:lessonSlug" element={<AllplanAccessGate />} />
      <Route path="/academy/:slug" element={<PublicAcademyDetail />} />
      <Route path="/pilot" element={<PilotApplication />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms" element={<LegalPage />} />
      <Route path="/privacy" element={<LegalPage />} />
      <Route path="/forgot-password" element={<PasswordRecovery />} />
      <Route path="/reset-password/:token" element={<PasswordRecovery reset />} />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />

      {/* Protected App Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="ifc-parser" element={<BimIfcParserPage />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="quotes/new" element={<CreateQuote />} />
          <Route path="quotes/:id" element={<QuoteDetail />} />
          <Route path="clients" element={<Clients />} />
          <Route path="regulations" element={<Regulations />} />
          <Route path="market-intelligence" element={<MarketIntelligence />} />
          <Route path="pilot-evidence" element={<PilotEvidence />} />
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
          <Route path="academy/exam" element={<AcademyExamPage />} />
          <Route path="academy/certificates" element={<AcademyCertificatesPage />} />
          <Route path="academy/profile" element={<AcademyProfilePage />} />
          <Route path="academy/cad-viewer" element={<AcademyCADPage />} />
          <Route path="academy/activation" element={<AcademyActivation />} />
          <Route path="academy/content/:slug" element={<LessonViewerPage />} />
          <Route path="academy/allplan" element={<AllplanAcademy />} />
          <Route path="academy/allplan/lesson/:lessonSlug" element={<ProtectedAllplanLessonPage />} />
          <Route path="academy/allplan/content/:slug" element={<LessonViewerPage />} />
          <Route path="bim-standards" element={<BimStandardsPage />} />
          <Route path="bim-glossary" element={<BimGlossaryPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes></Suspense>
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
