import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo';

export const MarketingNavbar: React.FC = () => {
  const location = useLocation();

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

        {/* CTA Button */}
        <div className="flex items-center space-x-4">
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
