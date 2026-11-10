import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  GitCompare,
  FileText,
  FileCheck2,
  Landmark,
  Scale,
  BarChart3,
  Users,
  Settings,
  Workflow,
  Shield,
  LogOut,
  Menu,
  X,
  Search,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';

export const DashboardLayout: React.FC = () => {
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Primary navigation matching redesign Page 4, 8, 9, 10
  const PRIMARY_NAV = [
    { name: 'Overview', path: '/' },
    { name: 'Payments', path: '/payments' },
    { name: 'Reconciliation', path: '/reconciliation' },
    { name: 'Invoices', path: '/invoices' },
    { name: 'eTIMS', path: '/etims' },
    { name: 'Banking', path: '/banking' },
    { name: 'Accounting', path: '/accounting' },
    { name: 'Reports', path: '/reports' },
  ];

  const SECONDARY_NAV = [
    { name: 'Customers', path: '/customers' },
    { name: 'Automations', path: '/automations' },
    { name: 'Team & RBAC', path: '/team' },
    { name: 'Audit Logs', path: '/audit' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-[#EEF2F6] text-slate-900 overflow-hidden font-sans selection:bg-[#16A6D9] selection:text-slate-950">
      {/* Sidebar for Desktop (Page 4, 8, 9, 10) */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#080D18] text-white flex-shrink-0 border-r border-slate-900">
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-900">
          <Logo variant="full" size="md" />
        </div>

        {/* Primary Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          {PRIMARY_NAV.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/' || location.pathname === '/overview'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-[#16A6D9] text-slate-950 rounded-2xl shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/60 rounded-xl'
                }`}
              >
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          {/* Secondary Nav Divider */}
          <div className="pt-6 pb-2 px-4">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-bold">
              Management
            </span>
          </div>

          {SECONDARY_NAV.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#16A6D9]/20 text-[#16A6D9] rounded-xl font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50 rounded-lg'
                }`}
              >
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User / Tenant Footer */}
        <div className="p-4 border-t border-slate-900 bg-black/30">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {user?.full_name || (user?.email ? user.email.split('@')[0] : 'User')}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {tenant?.name || 'My Organization'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#EEF2F6]">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-16 bg-[#080D18] text-white flex items-center justify-between px-4 border-b border-slate-900">
          <Logo variant="full" size="sm" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex">
            <div className="w-64 bg-[#080D18] text-white h-full flex flex-col p-4 border-r border-slate-900">
              <div className="flex justify-between items-center mb-6">
                <Logo variant="full" size="sm" />
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {PRIMARY_NAV.concat(SECONDARY_NAV).map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl ${
                        isActive
                          ? 'bg-[#16A6D9] text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`
                    }
                  >
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
