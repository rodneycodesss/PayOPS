import React from 'react';
import { Link } from 'react-router-dom';
import { MarketingNavbar } from '../components/MarketingNavbar';

export const ProductPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080D18] text-slate-100 font-sans selection:bg-[#16A6D9] selection:text-slate-950 flex flex-col justify-between">
      <MarketingNavbar />

      <main className="w-full">
        {/* Headline Section */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-20">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] max-w-4xl">
            Everything between a<br />
            payment and a <span className="text-[#16A6D9]">ledger<br />entry.</span>
          </h1>
        </section>

        {/* 6 Feature Cards Section (Page 6 Grid) */}
        <section className="bg-slate-100 text-slate-950 py-24 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

            {/* 06 Security by design (Dark Navy Card from Page 6) */}
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
        </section>
      </main>

      <footer className="py-8 px-6 bg-[#080D18] border-t border-slate-900 text-xs text-slate-500 text-center">
        Rodstar PayOps by Rodstar Tech Devs · rodstartechdevs.co.ke
      </footer>
    </div>
  );
};
