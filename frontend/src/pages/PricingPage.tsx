import React from 'react';
import { Link } from 'react-router-dom';
import { MarketingNavbar } from '../components/MarketingNavbar';

export const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080D18] text-slate-100 font-sans selection:bg-[#16A6D9] selection:text-slate-950 flex flex-col justify-between">
      <MarketingNavbar />

      <main className="max-w-7xl mx-auto px-6 py-20 w-full space-y-16">
        {/* Header */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Pricing that <span className="text-[#16A6D9]">grows with you.</span>
          </h1>
          <p className="text-lg text-slate-400">
            Monthly subscriptions. Final prices are set with our early-access customers.
          </p>
        </div>

        {/* Pricing Cards (3 Tiers from Page 5) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Tier 1: Starter */}
          <div className="bg-[#0B132B] border border-slate-800/80 rounded-3xl p-8 flex flex-col justify-between space-y-8 min-h-[380px]">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Starter
              </h3>
              <div className="text-4xl font-extrabold text-white">
                [KSh __] <span className="text-base font-normal text-slate-400">/ month</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed pt-2">
                One branch. M-PESA payments, automatic reconciliation and invoices.
              </p>
            </div>
            <Link
              to="/early-access"
              className="w-full py-3.5 px-4 rounded-xl border border-slate-700 hover:border-slate-500 text-white font-medium text-center text-sm transition"
            >
              Join early access
            </Link>
          </div>

          {/* Tier 2: Business (Featured Cyan Card) */}
          <div className="bg-[#16A6D9] text-slate-950 rounded-3xl p-8 flex flex-col justify-between space-y-8 min-h-[380px] shadow-2xl shadow-[#16A6D9]/10">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900/80">
                Business · most teams
              </h3>
              <div className="text-4xl font-extrabold text-slate-950">
                [KSh __] <span className="text-base font-medium text-slate-900/70">/ month</span>
              </div>
              <p className="text-slate-900 text-sm font-medium leading-relaxed pt-2">
                Multiple branches and users, bank statement import, ledger, reports and automations.
              </p>
            </div>
            <Link
              to="/early-access"
              className="w-full py-3.5 px-4 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-center text-sm transition shadow-lg"
            >
              Join early access
            </Link>
          </div>

          {/* Tier 3: Partner */}
          <div className="bg-[#0B132B] border border-slate-800/80 rounded-3xl p-8 flex flex-col justify-between space-y-8 min-h-[380px]">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Partner
              </h3>
              <div className="text-4xl font-extrabold text-white">
                [Custom]
              </div>
              <p className="text-slate-300 text-sm leading-relaxed pt-2">
                For accountants and agencies managing several client businesses, with onboarding support.
              </p>
            </div>
            <Link
              to="/early-access"
              className="w-full py-3.5 px-4 rounded-xl border border-slate-700 hover:border-slate-500 text-white font-medium text-center text-sm transition"
            >
              Talk to us
            </Link>
          </div>
        </div>

        {/* Footnote Notice */}
        <div className="text-xs text-slate-500 pt-4">
          Setup and onboarding fees, and usage add-ons such as SMS, may apply. Not yet KRA-certified; eTIMS runs in manual review mode.
        </div>
      </main>

      <footer className="py-8 px-6 bg-[#080D18] border-t border-slate-900 text-xs text-slate-500 text-center">
        Rodstar PayOps by Rodstar Tech Devs · rodstartechdevs.co.ke
      </footer>
    </div>
  );
};
