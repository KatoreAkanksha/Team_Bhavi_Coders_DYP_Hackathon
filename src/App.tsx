import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Toaster as SonnerToaster } from "sonner";
import Navbar from "@/components/Navbar";
import { Suspense, lazy, memo, useCallback } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorBoundary from "@/components/ErrorBoundary";
import InitMockData from "@/components/InitMockData";

// Lazy load pages with preload hints
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Budget = lazy(() => import("@/pages/Budget"));
const Groups = lazy(() => import("@/pages/Groups"));
const FinancialAdvisor = lazy(() => import("@/pages/FinancialAdvisor"));
const Settings = lazy(() => import("@/pages/Settings"));
const Profile = lazy(() => import("@/pages/Profile"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Memoize the main content to prevent unnecessary re-renders
const MainContent = memo(() => (
  <main className="flex-1 container mx-auto px-4 py-6">
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/advisor" element={<FinancialAdvisor />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  </main>
));

// Memoize the layout to prevent unnecessary re-renders
const Layout = memo(({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-background">
    <Navbar />
    {children}
  </div>
));

// Memoize the providers to prevent unnecessary re-renders
const Providers = memo(({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <ThemeProvider defaultTheme="light">
      <LanguageProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </LanguageProvider>
    </ThemeProvider>
  </AuthProvider>
));

function App() {
  const handleError = useCallback((error: Error) => {
    console.error("App error:", error);
  }, []);

  return (
    <ErrorBoundary onError={handleError}>
      <Router>
        <Providers>
          {/* Initialize mock data - this component doesn't render anything */}
          <InitMockData />
          <Layout>
            <MainContent />
          </Layout>
          <SonnerToaster position="bottom-right" />
          <Toaster />
        </Providers>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
