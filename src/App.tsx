/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';
import { SmartCheckDemoProvider } from '@/smartcheck/SmartCheckDemoContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NotFound } from '@/pages/NotFound';

import { ACADEMY_ENABLED } from '@/config/features';
const page = <T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(async () => {
    try {
      const mod = await loader();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`chunk_reload_${window.location.pathname}`);
      }
      return { default: mod[name] as ComponentType<any> };
    } catch (error) {
      if (typeof window !== 'undefined') {
        const key = `chunk_reload_${window.location.pathname}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          window.location.reload();
        }
      }
      throw error;
    }
  });
const LandingPage = page(() => import('@/pages/LandingPage'), 'LandingPage');
const Shell = page(() => import('@/components/layout/Shell'), 'Shell');
const Dashboard = page(() => import('@/pages/Dashboard'), 'Dashboard');
const AdminShell = page(() => import('@/components/layout/AdminShell'), 'AdminShell');
const AdminDashboard = page(() => import('@/pages/admin/AdminDashboard'), 'AdminDashboard');
const TenantsList = page(() => import('@/pages/admin/TenantsList'), 'TenantsList');
const TenantDetail = page(() => import('@/pages/admin/TenantDetail'), 'TenantDetail');
const AdminQueue = page(() => import('@/pages/admin/AdminQueue'), 'AdminQueue');
const PlansList = page(() => import('@/pages/admin/PlansList'), 'PlansList');
const PlanEditor = page(() => import('@/pages/admin/PlanEditor'), 'PlanEditor');
const PricingSources = page(() => import('@/pages/admin/PricingSources'), 'PricingSources');
const AdminReports = page(() => import('@/pages/admin/AdminReports'), 'AdminReports');
const DeveloperRoadmap = page(() => import('@/pages/admin/DeveloperRoadmap'), 'DeveloperRoadmap');
const CalculationMethods = page(() => import('@/pages/admin/CalculationMethods'), 'CalculationMethods');
const AdminLogs = page(() => import('@/pages/admin/AdminLogs'), 'AdminLogs');
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
const PublicBimGlossaryPage = page(() => import('@/pages/BimGlossaryPage'), 'PublicBimGlossaryPage');
const AcademyCertificatesPage = page(() => import('@/pages/AcademyCertificatesPage'), 'default');
const AcademyProfilePage = page(() => import('@/pages/AcademyProfilePage'), 'default');
const AcademyCADPage = page(() => import('@/pages/AcademyCADPage'), 'default');
const AcademyExamPage = page(() => import('@/pages/AcademyExamPage'), 'default');
const BimIfcParserPage = page(() => import('@/pages/BimIfcParserPage'), 'default');
const DosyadanTeklifDemo = page(() => import('@/pages/DosyadanTeklifDemo'), 'default');

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <SmartCheckDemoProvider>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background font-mono text-xs uppercase tracking-wider text-muted-foreground">Yükleniyor…</div>}><Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/about" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/pricing" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/features" element={<LandingPage onGetStarted={() => navigate('/login')} onPilotRequest={() => navigate('/pilot')} />} />
      <Route path="/smartcheck" element={<SmartCheckDemo />} />
      <Route path="/bim-sozlugu" element={<PublicBimGlossaryPage />} />
      {ACADEMY_ENABLED ? <>
        <Route path="/academy" element={<PublicAcademy />} />
        <Route path="/academy/complete" element={<CompleteAcademyContent />} />
        <Route path="/academy/allplan" element={<AllplanAccessGate />} />
        <Route path="/academy/allplan/:pathSlug" element={<AllplanAccessGate />} />
        <Route path="/academy/allplan/lesson/:lessonSlug" element={<AllplanAccessGate />} />
        <Route path="/academy/:slug" element={<PublicAcademyDetail />} />
      </> : <Route path="/academy/*" element={<Navigate to="/" replace />} />}
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
        {/* SÜPER ADMIN (PLATFORM YÖNETİMİ) ROTASI */}
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminDashboard />} />
          <Route path="leads" element={<PilotApplications />} />
          <Route path="pilot-applications" element={<Navigate to="/admin/leads" replace />} />
          <Route path="tenants" element={<TenantsList />} />
          <Route path="tenants/:companyId" element={<TenantDetail />} />
          <Route path="queue" element={<AdminQueue />} />
          <Route path="pricing-sources" element={<PricingSources />} />
          <Route path="plans" element={<PlansList />} />
          <Route path="plans/new" element={<PlanEditor />} />
          <Route path="plans/:planId" element={<PlanEditor />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="roadmap" element={<DeveloperRoadmap />} />
          <Route path="roadmap/calculations" element={<CalculationMethods />} />
          <Route path="logs" element={<AdminLogs />} />
        </Route>

        {/* TENANT (MÜŞTERİ) ROTASI */}
        <Route path="/app" element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="ifc-parser" element={<BimIfcParserPage />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="quotes/new" element={<CreateQuote />} />
          <Route path="quotes/:id/edit" element={<CreateQuote />} />
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
          <Route path="pilot-applications" element={<Navigate to="/admin/leads" replace />} />
          <Route path="settings" element={<Settings />} />
          <Route path="dosyadan-teklif-demo" element={<DosyadanTeklifDemo />} />
          <Route path="smartcheck" element={<SmartCheck />} />
          <Route path="smartcheck/checks/demo" element={<SmartCheckDemo />} />
          {ACADEMY_ENABLED ? <>
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
          </> : <Route path="academy/*" element={<Navigate to="/app" replace />} />}
          <Route path="bim-standards" element={<BimStandardsPage />} />
          <Route path="bim-glossary" element={<BimGlossaryPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
      </Routes></Suspense>
    </SmartCheckDemoProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
