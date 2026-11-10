import React from 'react';
import { Link } from 'react-router-dom';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080D18] text-slate-100 font-sans selection:bg-[#16A6D9] selection:text-slate-950">
      <MarketingNavbar />

      {/* Hero Section (Page 1 Top) */}
      <section className="relative pt-12 pb-24 px-6 overflow-hidden border-b border-slate-900">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline & CTA */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium">
              Built for Kenyan businesses · M-PESA ready
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold text-white tracking-tight leading-[1.05]">
              Every<br />
              shilling,<br />
              <span className="text-[#16A6D9]">matched.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-xl leading-relaxed">
              Collect M-PESA and bank payments, reconcile them to invoices automatically and keep books your accountant will love.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/early-access"
                className="px-7 py-3.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 text-base font-bold transition shadow-xl shadow-[#16A6D9]/25"
              >
                Get early access
              </Link>
              <a
                href="#how-it-works"
                className="px-7 py-3.5 rounded-xl bg-transparent hover:bg-slate-900 border border-slate-700 text-white text-base font-medium transition"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Right Column: Hero Preview Card (Page 1) */}
          <div className="lg:col-span-5">
            <div className="bg-[#0B132B] rounded-3xl border border-slate-800/80 p-8 shadow-2xl relative">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Collected today</span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800/60 text-slate-400 text-[11px]">
                  Illustrative screen
                </span>
              </div>

              <div className="text-4xl sm:text-5xl font-extrabold text-[#16A6D9] tracking-tight mt-1 mb-6 font-sans">
                KSh 184,500
              </div>

              {/* Graphic Bar Chart Visual */}
              <div className="flex items-end space-x-2 h-20 mb-8 pt-4">
                <div className="w-4 bg-[#16A6D9]/30 rounded-t h-8"></div>
                <div className="w-4 bg-[#16A6D9]/40 rounded-t h-12"></div>
                <div className="w-4 bg-[#16A6D9]/30 rounded-t h-7"></div>
                <div className="w-4 bg-[#16A6D9]/50 rounded-t h-14"></div>
                <div className="w-4 bg-[#16A6D9]/70 rounded-t h-16"></div>
                <div className="w-4 bg-[#16A6D9]/60 rounded-t h-10"></div>
                <div className="w-4 bg-[#16A6D9]/80 rounded-t h-18"></div>
                <div className="w-4 bg-[#16A6D9] rounded-t h-20"></div>
                <div className="w-4 bg-[#16A6D9] rounded-t h-16"></div>
              </div>

              {/* Recent Matched List */}
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-[#080D18] border border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-300">SKT4X92LQ1 to INV-0042</span>
                  <span className="text-[#16A6D9] font-bold font-sans">Matched</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#080D18] border border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-300">SKT2C77PD3</span>
                  <span className="text-amber-400 font-bold font-sans">Needs review</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* One System for the Whole Money Trail (Page 1 Bottom) */}
      <section className="py-24 px-6 bg-slate-50 text-slate-900">
        <div className="max-w-7xl mx-auto space-y-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-950">
            One system for the whole<br />
            money trail
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: COLLECT (Dark Navy) */}
            <div className="bg-[#080D18] text-white p-8 rounded-3xl space-y-6 flex flex-col justify-between min-h-[260px]">
              <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
                COLLECT
              </span>
              <p className="text-2xl font-bold leading-snug">
                M-PESA in. Bank statements in. Nothing falls through.
              </p>
            </div>

            {/* Card 2: RECONCILE (Vibrant Cyan) */}
            <div className="bg-[#16A6D9] text-slate-950 p-8 rounded-3xl space-y-6 flex flex-col justify-between min-h-[260px]">
              <span className="text-xs font-mono font-bold tracking-widest text-slate-900/70 uppercase">
                RECONCILE
              </span>
              <p className="text-2xl font-bold leading-snug">
                Ambiguous payments go to a human, never a guess.
              </p>
            </div>

            {/* Card 3: LEDGER (White) */}
            <div className="bg-white border border-slate-200 text-slate-950 p-8 rounded-3xl space-y-6 flex flex-col justify-between min-h-[260px] shadow-sm">
              <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">
                LEDGER
              </span>
              <p className="text-2xl font-bold leading-snug">
                Double-entry books that always balance.
              </p>
            </div>
          </div>

          {/* Card 4 (Wide): INVOICES AND eTIMS */}
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest text-[#16A6D9] uppercase">
              INVOICES AND eTIMS
            </span>
            <p className="text-xl sm:text-2xl font-bold text-slate-950">
              Issue VAT invoices and track every one through a review workflow.
            </p>
          </div>
        </div>
      </section>

      {/* From payment to ledger in three steps (Page 2 Top) */}
      <section id="how-it-works" className="py-24 px-6 bg-[#080D18] text-white border-b border-slate-900">
        <div className="max-w-7xl mx-auto space-y-16">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            From payment to ledger in three steps
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 01 */}
            <div className="space-y-4">
              <div className="text-5xl font-extrabold text-[#16A6D9] font-sans">01</div>
              <h3 className="text-2xl font-bold text-white">Get paid</h3>
              <p className="text-slate-400 text-base leading-relaxed">
                Customers pay by STK Push or Paybill. We record every payment once with strict duplicate protection.
              </p>
            </div>

            {/* Step 02 */}
            <div className="space-y-4">
              <div className="text-5xl font-extrabold text-[#16A6D9] font-sans">02</div>
              <h3 className="text-2xl font-bold text-white">Match it</h3>
              <p className="text-slate-400 text-base leading-relaxed">
                Payments are matched to invoices by reference, amount and date. Unclear cases go to manual review.
              </p>
            </div>

            {/* Step 03 */}
            <div className="space-y-4">
              <div className="text-5xl font-extrabold text-[#16A6D9] font-sans">03</div>
              <h3 className="text-2xl font-bold text-white">Close the books</h3>
              <p className="text-slate-400 text-base leading-relaxed">
                Ledger entries post automatically. Debits equal credits every time. Reports are ready any day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner (Page 2 Bottom) */}
      <section className="py-20 px-6 bg-[#16A6D9] text-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Be among the first<br />
              businesses on PayOps
            </h2>
          </div>
          <div>
            <Link
              to="/early-access"
              className="inline-flex items-center px-8 py-4 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white text-base font-bold transition shadow-2xl"
            >
              Join early access
            </Link>
          </div>
        </div>
      </section>

      {/* Footer (Page 2) */}
      <footer className="py-10 px-6 bg-[#080D18] border-t border-slate-900 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Rodstar PayOps by Rodstar Tech Devs ·{' '}
            <a href="https://rodstartechdevs.co.ke" target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white underline">
              rodstartechdevs.co.ke
            </a>
          </div>
          <div className="text-slate-500">
            eTIMS runs in manual review mode. Not yet KRA-certified.
          </div>
        </div>
      </footer>
    </div>
  );
};
