import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Logo } from './components/Logo';

import { OverviewPage } from './pages/OverviewPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { EtimsPage } from './pages/EtimsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { BankingPage } from './pages/BankingPage';
import { AccountingPage } from './pages/AccountingPage';
import { ReportsPage } from './pages/ReportsPage';
import { AutomationsPage } from './pages/AutomationsPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const token = localStorage.getItem('access_token');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0F1D] flex flex-col items-center justify-center space-y-4 text-slate-400 font-sans">
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

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="reconciliation" element={<ReconciliationPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="etims" element={<EtimsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="banking" element={<BankingPage />} />
              <Route path="accounting" element={<AccountingPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="automations" element={<AutomationsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
