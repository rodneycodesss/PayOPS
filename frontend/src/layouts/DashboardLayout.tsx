import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  Menu,
  X,
  Bot,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';
import { PayOpsAssistant } from '../components/PayOpsAssistant';

export const DashboardLayout: React.FC = () => {
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Exactly matching the 15 sidebar items from the 22-page official design system
  const NAV_ITEMS = [
    { name: 'Overview', path: '/' },
    { name: 'Payments', path: '/payments' },
    { name: 'Transactions', path: '/transactions' },
    { name: 'Reconciliation', path: '/reconciliation' },
    { name: 'Invoices', path: '/invoices' },
    { name: 'eTIMS', path: '/etims' },
    { name: 'Customers', path: '/customers' },
    { name: 'Products and Services', path: '/products' },
    { name: 'Banking', path: '/banking' },
    { name: 'Accounting', path: '/accounting' },
    { name: 'Reports', path: '/reports' },
    { name: 'Automations', path: '/automations' },
    { name: 'Team and Permissions', path: '/team' },
    { name: 'Business Settings', path: '/settings' },
    { name: 'Audit Logs', path: '/audit' },
  ];

  return (
    <div className="flex h-screen bg-[#EEF2F6] text-slate-900 overflow-hidden font-sans selection:bg-[#16A6D9] selection:text-slate-950">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#080D18] text-white flex-shrink-0 border-r border-slate-900 select-none">
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-900">
          <Logo variant="full" size="md" />
        </div>

        {/* 15 Primary Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/' || location.pathname === '/overview' || location.pathname === '/app'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#16A6D9] text-slate-950 rounded-2xl shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/60 rounded-xl'
                }`}
              >
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* PayOps Assistant Floating Action Pill */}
        <div className="px-4 py-2">
          <button
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-bold transition flex items-center justify-between shadow-sm ${
              isAssistantOpen
                ? 'bg-[#16A6D9] text-slate-950'
                : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-[#16A6D9]" />
              <span>PayOps Assistant</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 font-normal">
              {isAssistantOpen ? 'Close' : 'Ask'}
            </span>
          </button>
        </div>

        {/* User / Tenant Footer */}
        <div className="p-4 border-t border-slate-900 bg-black/40">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
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
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0"
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
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAssistantOpen(!isAssistantOpen)}
              className="p-2 text-slate-300 hover:text-white"
            >
              <Sparkles className="w-5 h-5 text-[#16A6D9]" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
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
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 text-xs font-semibold rounded-xl ${
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

        {/* Main Content Area + Optional PayOps Assistant Split (Page 21) */}
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 sm:p-8">
            <Outlet />
          </main>

          {/* PayOps Assistant Side Drawer / Column (Page 21) */}
          {isAssistantOpen && (
            <aside className="w-96 border-l border-slate-200 bg-white flex flex-col shadow-xl z-20">
              <PayOpsAssistant onClose={() => setIsAssistantOpen(false)} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
