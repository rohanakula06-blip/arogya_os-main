import { SupabaseStartup } from "@/components/startup/supabase-startup";
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/layout/app-shell";
import { SupabaseAuthProvider } from "@/components/auth/supabase-auth-provider";
import { ThemeProvider } from "next-themes";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Signup = lazy(() => import("./pages/Signup.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const UploadReport = lazy(() => import("./pages/UploadReport.tsx"));
const HealthJourney = lazy(() => import("./pages/HealthJourney.tsx"));
const HealthBaseline = lazy(() => import("./pages/HealthBaseline.tsx"));
const DoctorCopilot = lazy(() => import("./pages/DoctorCopilot.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const PatientProfile = lazy(() => import("./pages/PatientProfile.tsx"));
const Appointments = lazy(() => import("./pages/Appointments.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// LabFlow Diagnostic Operations Suite
const LabFlowDashboard = lazy(() => import("./pages/labflow/LabFlowDashboard.tsx"));
const OrderCreation = lazy(() => import("./pages/labflow/OrderCreation.tsx"));
const SampleTracking = lazy(() => import("./pages/labflow/SampleTracking.tsx"));
const TechnicianWorklist = lazy(() => import("./pages/labflow/TechnicianWorklist.tsx"));
const PathologistReview = lazy(() => import("./pages/labflow/PathologistReview.tsx"));
const DiagnosticCatalog = lazy(() => import("./pages/labflow/DiagnosticCatalog.tsx"));
const LabAnalytics = lazy(() => import("./pages/labflow/LabAnalytics.tsx"));
const PatientReportViewer = lazy(() => import("./pages/labflow/PatientReportViewer.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

function Root() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected */}
        <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadReport />} />
          <Route path="/journey" element={<HealthJourney />} />
          {/* The timeline lives inside Health Journey; keep old links working. */}
          <Route path="/timeline" element={<Navigate to="/journey" replace />} />
          <Route path="/baseline" element={<HealthBaseline />} />
          <Route path="/doctor-copilot" element={<DoctorCopilot />} />
          {/* Keep the legacy copilot path working. */}
          <Route path="/copilot" element={<Navigate to="/doctor-copilot" replace />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/patient-profile" element={<PatientProfile />} />
          <Route path="/profile" element={<Profile />} />

          {/* LabFlow Diagnostic Operations Suite */}
          <Route path="/labflow" element={<LabFlowDashboard />} />
          <Route path="/labflow/orders/new" element={<OrderCreation />} />
          <Route path="/labflow/tracking" element={<SampleTracking />} />
          <Route path="/labflow/worklist" element={<TechnicianWorklist />} />
          <Route path="/labflow/review" element={<PathologistReview />} />
          <Route path="/labflow/catalog" element={<DiagnosticCatalog />} />
          <Route path="/labflow/analytics" element={<LabAnalytics />} />
          <Route path="/labflow/report/:orderId" element={<PatientReportViewer />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

import { TranslationProvider } from "@/context/translation-context";
import { FloatingLanguageWidget } from "@/components/language/floating-language-widget";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TranslationProvider>
        <SupabaseStartup />
        <SupabaseAuthProvider>
          <BrowserRouter>
            <Root />
          </BrowserRouter>
          <Toaster position="top-center" richColors />
          <FloatingLanguageWidget />
        </SupabaseAuthProvider>
      </TranslationProvider>
    </ThemeProvider>
    <VlyToolbar />
  </StrictMode>,
);
//hi