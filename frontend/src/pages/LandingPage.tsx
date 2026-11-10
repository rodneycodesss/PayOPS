import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { ArrowRight, CheckCircle2, ArrowUp } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [heroTab, setHeroTab] = useState<'preview' | 'assistant'>('preview');
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: 'Hi! I can answer questions about PayOps. What would you like to know?',
    },
    {
      sender: 'user',
      text: 'Is it KRA-certified?',
    },
    {
      sender: 'assistant',
      text: 'Not yet. eTIMS runs in manual review mode until KRA approval is complete. I can tell you how that works.',
    },
  ]);

  const handleAssistantSend = (q?: string) => {
    const question = q || assistantInput;
    if (!question.trim()) return;

    setAssistantMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setAssistantInput('');

    setTimeout(() => {
      let ans = "PayOps provides deterministic 5-tier reconciliation, double-entry general ledger, and compliant KRA eTIMS invoicing.";
      if (question.toLowerCase().includes('reconciliation')) {
        ans = "Reconciliation matches payments to invoices automatically by reference, exact amount, customer phone/account, and 3-day date windows. Ambiguous items go to a review queue.";
      } else if (question.toLowerCase().includes('pricing')) {
        ans = "We offer Starter (single branch), Business (multi-branch, statement import, ledger), and Partner plans for accounting firms.";
      } else if (question.toLowerCase().includes('early access')) {
        ans = "You can request early access directly via the button in the top right. Onboarding takes under 5 minutes.";
      }
      setAssistantMessages((prev) => [...prev, { sender: 'assistant', text: ans }]);
    }, 400);
  };
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

          {/* Right Column: Hero Preview Card (Page 1) or Ask about PayOps (Page 22) */}
          <div className="lg:col-span-5 space-y-3">
            {/* Toggle Pills */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setHeroTab('preview')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  heroTab === 'preview'
                    ? 'bg-[#16A6D9] text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Money Trail Preview
              </button>
              <button
                onClick={() => setHeroTab('assistant')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  heroTab === 'assistant'
                    ? 'bg-[#16A6D9] text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Ask about PayOps
              </button>
            </div>

            {heroTab === 'preview' ? (
              <div className="bg-[#0B132B] rounded-3xl border border-slate-800/80 p-8 shadow-2xl relative animate-in fade-in">
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
            ) : (
              /* Ask about PayOps Card (Page 22) */
              <div className="bg-white text-slate-900 rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl relative animate-in fade-in flex flex-col justify-between min-h-[420px]">
                <div className="space-y-1 pb-3 border-b border-slate-100">
                  <h3 className="text-base font-extrabold text-slate-950">Ask about PayOps</h3>
                  <p className="text-xs text-slate-500">
                    Answers about features, pricing and early access
                  </p>
                </div>

                {/* Conversation Body (Page 22) */}
                <div className="space-y-3 my-4 text-xs">
                  {assistantMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`px-4 py-2.5 rounded-2xl max-w-[85%] leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-[#080D18] text-white font-medium'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Suggestion Pills (Page 22) */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <button
                    onClick={() => handleAssistantSend('How does reconciliation work?')}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition"
                  >
                    How does reconciliation work?
                  </button>
                  <button
                    onClick={() => handleAssistantSend('Pricing')}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition"
                  >
                    Pricing
                  </button>
                  <Link
                    to="/early-access"
                    className="px-2.5 py-1 rounded-full bg-[#16A6D9]/15 text-[#0284C7] hover:bg-[#16A6D9]/25 text-[11px] font-semibold transition"
                  >
                    Join early access
                  </Link>
                </div>

                {/* Input Form (Page 22) */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAssistantSend();
                  }}
                  className="relative flex items-center mt-3 pt-2 border-t border-slate-100"
                >
                  <input
                    type="text"
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    placeholder="Type your question"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#16A6D9] focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 p-1.5 rounded-lg bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold transition shadow-sm"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
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
