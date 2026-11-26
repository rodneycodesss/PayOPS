import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from './Logo';

export const MarketingNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    try {
      setIsDemoLoading(true);
      await demoLogin();
      navigate('/');
    } catch (err) {
      console.error('Demo login failed', err);
      navigate('/login');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <nav className="w-full bg-[#080D18] border-b border-slate-800/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand Lockup */}
        <Link to="/" className="flex items-center">
          <Logo variant="full" size="md" />
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <Link
            to="/product"
            className={`transition hover:text-white ${
              location.pathname === '/product' ? 'text-white' : ''
            }`}
          >
            Product
          </Link>
          <a href="/#how-it-works" className="transition hover:text-white">
            How it works
          </a>
          <Link
            to="/pricing"
            className={`transition hover:text-white ${
              location.pathname === '/pricing' ? 'text-white' : ''
            }`}
          >
            Pricing
          </Link>
          <Link to="/login" className="transition hover:text-white">
            Log in
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
            className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-[#16A6D9] hover:text-white border border-[#16A6D9]/30 hover:border-[#16A6D9]/60 text-sm font-semibold transition flex items-center space-x-2 shadow-sm"
            title="Explore live demo sandbox"
          >
            {isDemoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#16A6D9]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#16A6D9]" />
            )}
            <span>{isDemoLoading ? 'Loading Demo...' : 'Demo Login'}</span>
          </button>

          <Link
            to="/early-access"
            className="px-5 py-2.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 text-sm font-bold transition shadow-lg shadow-[#16A6D9]/20"
          >
            Join early access
          </Link>
        </div>
      </div>
    </nav>
  );
};
