import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { MarketingNavbar } from '../components/MarketingNavbar';

export const ProductPage: React.FC = () => {
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
    <div className="min-h-screen bg-[#080D18] text-slate-100 font-sans selection:bg-[#16A6D9] selection:text-slate-950 flex flex-col justify-between">
      <MarketingNavbar />

      <main className="w-full">
        {/* Headline Section */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#16A6D9]/10 border border-[#16A6D9]/20 text-[#16A6D9] text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Demo Available · No Credentials Needed</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] max-w-4xl">
            Everything between a<br />
            payment and a <span className="text-[#16A6D9]">ledger<br />entry.</span>
          </h1>

          <p className="mt-6 text-slate-400 text-lg sm:text-xl max-w-2xl leading-relaxed">
            From M-PESA callbacks and bank statement reconciliation to Kenyan eTIMS tax compliance
            and double-entry accounting.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isDemoLoading}
              className="px-6 py-3.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 text-base font-bold transition flex items-center space-x-2 shadow-lg shadow-[#16A6D9]/20"
            >
              {isDemoLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              <span>{isDemoLoading ? 'Launching Demo...' : 'Try Live Demo'}</span>
              {!isDemoLoading && <ArrowRight className="w-4 h-4 ml-1" />}
            </button>

            <Link
              to="/early-access"
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-base font-semibold transition"
            >
              Join early access
            </Link>
          </div>
        </section>

        {/* 6 Feature Cards Section */}
        <section className="bg-slate-100 text-slate-950 py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                Designed specifically for Kenyan business operations
              </h2>
              <p className="text-slate-600 mt-2 text-base">
                Purpose-built modules that eliminate manual spreadsheet reconciliation and compliance stress.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* 01 M-PESA payments */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[300px]">
                <div className="text-4xl font-extrabold text-[#16A6D9]">01</div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-slate-950">M-PESA payments</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    STK Push and C2B with duplicate protection, so a repeated callback never creates a second payment.
                  </p>
                </div>
              </div>

              {/* 02 Automatic reconciliation */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[300px]">
                <div className="text-4xl font-extrabold text-[#16A6D9]">02</div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-slate-950">Automatic reconciliation</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Matches by reference, invoice, amount and date. Unclear cases go to an exceptions queue for a person to decide.
                  </p>
                </div>
              </div>

              {/* 03 Invoices and eTIMS workflow */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[300px]">
                <div className="text-4xl font-extrabold text-[#16A6D9]">03</div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-slate-950">Invoices and eTIMS workflow</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    VAT invoices, credit notes and a clear status for every invoice, from draft to recorded.
                  </p>
                </div>
              </div>

              {/* 04 Double-entry accounting */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[300px]">
                <div className="text-4xl font-extrabold text-[#16A6D9]">04</div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-slate-950">Double-entry accounting</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Every entry balances. Corrections are reversals, so history is never rewritten.
                  </p>
                </div>
              </div>

              {/* 05 Bank statement import */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[300px]">
                <div className="text-4xl font-extrabold text-[#16A6D9]">05</div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-slate-950">Bank statement import</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Upload CSV statements. Duplicates and bad rows are caught and reported.
                  </p>
                </div>
              </div>

              {/* 06 Security by design */}
              <div className="bg-[#080D18] text-white rounded-3xl p-8 border border-slate-800 shadow-sm flex flex-col justify-between min-h-[300px]">
                <div className="text-4xl font-extrabold text-[#16A6D9]">06</div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white">Security by design</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Separate data for every business, roles and permissions, two-factor login and a full audit trail.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Demo Banner Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#0A1A2F] border border-slate-800 p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center space-x-2 text-[#16A6D9] text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Instant Access Demo Sandbox</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Experience Rodstar PayOps in action right now
              </h2>
              <p className="text-slate-400 text-base leading-relaxed">
                Take a self-guided tour of the live application. Explore pre-configured M-PESA payments,
                reconciliation queues, and tax ledgers without entering any passwords or setting up 2FA.
              </p>
              <div className="flex flex-wrap gap-y-2 gap-x-6 pt-2 text-xs text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full admin feature access</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Pre-seeded transactions & ledger</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero setup required</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isDemoLoading}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 text-base font-bold transition flex items-center justify-center space-x-2 shadow-xl shadow-[#16A6D9]/25"
              >
                {isDemoLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                <span>{isDemoLoading ? 'Launching Demo...' : 'Explore Live Demo'}</span>
                {!isDemoLoading && <ArrowRight className="w-4 h-4 ml-1" />}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 bg-[#080D18] border-t border-slate-900 text-xs text-slate-500 text-center">
        Rodstar PayOps by Rodstar Tech Devs · rodstartechdevs.co.ke
      </footer>
    </div>
  );
};
