import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Logo } from './components/Logo';

// Public Pages (Redesign Pages 1, 2, 5, 6, 7)
import { LandingPage } from './pages/LandingPage';
import { ProductPage } from './pages/ProductPage';
import { PricingPage } from './pages/PricingPage';
import { EarlyAccessPage } from './pages/EarlyAccessPage';
import { LoginPage } from './pages/LoginPage';

// App Dashboard Pages (Redesign Pages 4, 8, 9, 10 + Core)
import { OverviewPage } from './pages/OverviewPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { EtimsPage } from './pages/EtimsPage';
import { BankingPage } from './pages/BankingPage';
import { AccountingPage } from './pages/AccountingPage';
import { ReportsPage } from './pages/ReportsPage';
import { CustomersPage } from './pages/CustomersPage';
import { AutomationsPage } from './pages/AutomationsPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ProductsPage } from './pages/ProductsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Root index route:
 * - If user is logged in: renders Dashboard with OverviewPage (Page 4).
 * - If user is not logged in: renders Public Marketing Landing Page (Pages 1 & 2).
 */
const RootIndexRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  const token = localStorage.getItem('access_token');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080D18] flex flex-col items-center justify-center space-y-4 text-slate-400 font-sans">
        <Logo variant="full" size="xl" className="animate-pulse" />
        <div className="text-xs font-mono text-slate-500">
          Initializing Rodstar PayOps Engine...
        </div>
      </div>
    );
  }

  if (token || user) {
    return (
      <DashboardLayout />
    );
  }

  return <LandingPage />;
};

const ProtectedDashboard: React.FC = () => {
  const { user, isLoading } = useAuth();
  const token = localStorage.getItem('access_token');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080D18] flex flex-col items-center justify-center space-y-4 text-slate-400 font-sans">
        <Logo variant="full" size="xl" className="animate-pulse" />
        <div className="text-xs font-mono text-slate-500">
          Initializing Rodstar PayOps Engine...
        </div>
      </div>
    );
  }

  if (!token && !user) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Marketing & Onboarding Pages */}
            <Route path="/product" element={<ProductPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/early-access" element={<EarlyAccessPage />} />
            <Route path="/register" element={<EarlyAccessPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Dashboard Root with conditional rendering */}
            <Route path="/" element={<RootIndexRoute />}>
              <Route index element={<OverviewPage />} />
            </Route>

            {/* Authenticated Dashboard Pages */}
            <Route element={<ProtectedDashboard />}>
              <Route path="/app" element={<OverviewPage />} />
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/reconciliation" element={<ReconciliationPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/etims" element={<EtimsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/banking" element={<BankingPage />} />
              <Route path="/accounting" element={<AccountingPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/automations" element={<AutomationsPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/audit" element={<AuditLogsPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
