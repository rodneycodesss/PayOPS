import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  History,
  GitCompare,
  FileText,
  FileCheck2,
  Users,
  Package,
  Landmark,
  Scale,
  BarChart3,
  Cpu,
  ShieldCheck,
  Building2,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Bell,
  CircleDot
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/transactions', label: 'Transactions', icon: History },
  { path: '/reconciliation', label: 'Reconciliation', icon: GitCompare },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/etims', label: 'eTIMS Tax', icon: FileCheck2 },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/products', label: 'Products & Services', icon: Package },
  { path: '/banking', label: 'Banking', icon: Landmark },
  { path: '/accounting', label: 'Accounting & Ledger', icon: Scale },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/automations', label: 'Automations', icon: Cpu },
  { path: '/team', label: 'Team & Permissions', icon: ShieldCheck },
  { path: '/settings', label: 'Business Settings', icon: Building2 },
  { path: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
];

export const DashboardLayout: React.FC = () => {
  const { user, tenant, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#0A0F1D] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-72 bg-[#0B192C] border-r border-[#1E2E48]">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#1E2E48]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
              R
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-lg">RODSTAR</span>
              <span className="text-xs ml-1.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-medium">PAYOPS</span>
            </div>
          </div>
        </div>

        {/* Tenant Organization Switcher Info */}
        <div className="px-5 py-4 border-b border-[#1E2E48]/60 bg-[#0E1E35]/50">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Active Organization</div>
          <div className="font-medium text-slate-100 text-sm truncate">{tenant?.name || 'Rodstar Tech Devs Ltd'}</div>
          <div className="flex items-center space-x-2 mt-1.5">
            <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              PIN: {tenant?.kra_pin || 'P051122334K'}
            </span>
            <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">
              {tenant?.currency || 'KES'}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#11223A]'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Session Footer */}
        <div className="p-4 border-t border-[#1E2E48] bg-[#0E1E35]/40 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium text-slate-200 truncate">{user?.full_name || 'Rodney Gilbert'}</div>
              <div className="text-xs text-slate-400 capitalize truncate">{user?.roles?.[0] || 'owner'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/60 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-[#0B192C]/80 backdrop-blur border-b border-[#1E2E48] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="flex items-center text-emerald-400">
                <CircleDot className="w-2.5 h-2.5 mr-1.5 animate-pulse text-emerald-400" />
                Live API Engine (127.0.0.1:8000)
              </span>
              <span>•</span>
              <span>Double-Entry Immutable Ledger</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#102A45] border border-emerald-500/30 text-emerald-300">
              Release 1 Core
            </span>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex">
            <div className="w-72 bg-[#0B192C] h-full flex flex-col border-r border-[#1E2E48] p-4">
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-white text-lg">RODSTAR PAYOPS</span>
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
                      `flex items-center px-3 py-2 rounded-lg text-sm ${
                        isActive ? 'bg-emerald-500 text-white' : 'text-slate-400'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Page Body Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0A0F1D]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
