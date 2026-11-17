import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { ArrowRight, CheckCircle2, ArrowUp, Sparkles, Activity, ShieldCheck, Zap, Layers, Smartphone, RefreshCw, ChevronRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [heroTab, setHeroTab] = useState<'preview' | 'assistant'>('preview');
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const words = ['matched.', 'reconciled.', 'automated.', 'audit-ready.'];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWordIdx((prev) => (prev + 1) % words.length);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

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

      {/* Hero Section (Cinematic Animated Financial Command Deck) */}
      <section className="relative pt-16 pb-28 px-6 overflow-hidden border-b border-slate-900 bg-[#060A14]">
        {/* Cinematic Backdrop Glows & Grid */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top Radial Flare */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-[#16A6D9]/25 via-indigo-600/10 to-transparent blur-[120px] rounded-full animate-pulse-glow" />
          {/* Background Grid Accent */}
          <div className="absolute inset-0 bg-[radial-gradient(#16A6D9_1px,transparent_1px)] [background-size:32px_32px] opacity-10" />
          {/* Ambient Floating Glow Spheres */}
          <div className="absolute top-1/4 -left-24 w-96 h-96 bg-[#16A6D9]/15 rounded-full blur-[100px] animate-float-slow" />
          <div className="absolute bottom-10 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-float-reverse" />
          {/* Anamorphic Laser Horizon Beam */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#16A6D9]/60 to-transparent shadow-[0_0_15px_#16A6D9]" />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column: Cinematic Headline & CTA */}
          <div className="lg:col-span-7 space-y-8">
            {/* Live Telemetry Pill */}
            <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-[#0B132B]/90 border border-[#16A6D9]/30 text-xs text-slate-300 font-medium backdrop-blur-md shadow-lg shadow-[#16A6D9]/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="tracking-wide text-[11px] font-semibold text-slate-200">
                AUTOMATION FOR KENYAN BUSINESSES · 
              </span>
            </div>

            {/* Dynamic Animated Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tight leading-[1.05]">
              Every shilling,<br />
              <span className="inline-block relative">
                <span className="shimmer-text font-extrabold transition-all duration-300">
                  {words[activeWordIdx]}
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-[#16A6D9] via-emerald-400 to-transparent rounded-full shadow-[0_0_12px_#16A6D9]"></span>
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-xl leading-relaxed font-normal">
              Autonomous financial operations for modern Kenyan businesses. Collect via M-PESA & bank rails, eliminate reconciliation backlog with deterministic 5-tier matching, and keep books your accountant will love.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/early-access"
                className="group relative px-7 py-4 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 text-base font-extrabold transition shadow-xl shadow-[#16A6D9]/30 flex items-center space-x-2 overflow-hidden"
              >
                <span className="relative z-10">Get early access</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </Link>
              <a
                href="#how-it-works"
                className="px-7 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-white text-base font-medium transition backdrop-blur-sm flex items-center space-x-2"
              >
                <span>See how it works</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>
            </div>

            {/* Key Trust Telemetry Row */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-900/80 text-xs">
              <div>
                <div className="text-[#16A6D9] font-black text-lg font-mono">99.98%</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Auto-Match Accuracy</div>
              </div>
              <div>
                <div className="text-emerald-400 font-black text-lg font-mono">KSh 0.00</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Custody Risk (Direct Bank)</div>
              </div>
              <div>
                <div className="text-amber-400 font-black text-lg font-mono">&lt; 2.5s</div>
                <div className="text-slate-400 text-[11px] mt-0.5">STK Handset Latency</div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Preview Card / Live Holographic Stream */}
          <div className="lg:col-span-5 space-y-3">
            {/* Toggle Switcher */}
            <div className="flex items-center space-x-2 bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80 backdrop-blur-md w-fit">
              <button
                onClick={() => setHeroTab('preview')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  heroTab === 'preview'
                    ? 'bg-[#16A6D9] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Money Stream Telemetry</span>
              </button>
              <button
                onClick={() => setHeroTab('assistant')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  heroTab === 'assistant'
                    ? 'bg-[#16A6D9] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask PayOps AI</span>
              </button>
            </div>

            {heroTab === 'preview' ? (
              <div className="bg-[#0B132B]/95 rounded-3xl border border-[#16A6D9]/30 p-7 shadow-2xl relative backdrop-blur-xl animate-in fade-in overflow-hidden shadow-[#16A6D9]/10">
                {/* Top Subtle Scan Line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#16A6D9] to-transparent animate-laser"></div>

                <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-mono text-slate-300 text-[11px] font-semibold tracking-wider">LIVE MONEY TRAIL</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#16A6D9]/10 text-[#16A6D9] text-[10px] font-semibold border border-[#16A6D9]/20 font-mono">
                    KENYA SHILLINGS (KES)
                  </span>
                </div>

                <div className="mt-4 mb-2">
                  <span className="text-xs text-slate-400">Total Collected Today</span>
                  <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-1 font-mono flex items-baseline space-x-2">
                    <span className="text-[#16A6D9]">KSh</span>
                    <span>184,500</span>
                    <span className="text-emerald-400 text-xs font-sans font-semibold tracking-normal flex items-center ml-2">
                      +14.2% today
                    </span>
                  </div>
                </div>

                {/* Animated Audio/Financial Telemetry Wave */}
                <div className="my-6 p-3 rounded-2xl bg-[#080D18]/80 border border-slate-800/80 flex items-center justify-between space-x-1.5 h-16">
                  {[45, 75, 30, 90, 65, 80, 50, 95, 70, 85, 40, 100, 60, 80, 55].map((h, i) => (
                    <div
                      key={i}
                      className="w-full bg-[#16A6D9] rounded-full transition-all duration-500 opacity-80 hover:opacity-100"
                      style={{
                        height: `${h}%`,
                        animation: `bar-dance 1.8s ease-in-out infinite ${i * 0.12}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Live Real-Time Transaction Stream */}
                <div className="space-y-2.5 font-mono text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#080D18] border border-[#16A6D9]/30 flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                        STK
                      </div>
                      <div>
                        <div className="text-slate-200 font-semibold text-xs">SKT4X92LQ1 → INV-0042</div>
                        <div className="text-[10px] text-slate-500 font-sans">254722***410 · KSh 12,000.00</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold font-sans text-[10px]">
                      Auto-Matched
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#080D18] border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#16A6D9]/10 text-[#16A6D9] flex items-center justify-center font-bold text-[10px]">
                        WIRE
                      </div>
                      <div>
                        <div className="text-slate-300 font-semibold text-xs">BNK-20931 → Equity Upper Hill</div>
                        <div className="text-[10px] text-slate-500 font-sans">Corporate Wire · KSh 48,000.00</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#16A6D9]/10 border border-[#16A6D9]/30 text-[#16A6D9] font-bold font-sans text-[10px]">
                      Reconciled
                    </span>
                  </div>
                </div>

                {/* Direct Bank Settlement Guarantee Badge */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Direct Commercial Bank Settlement</span>
                  </div>
                  <span className="font-mono text-[#16A6D9]">0 Unreconciled</span>
                </div>
              </div>
            ) : (
              /* Ask about PayOps Card */
              <div className="bg-[#0B132B]/95 rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-2xl relative animate-in fade-in flex flex-col justify-between min-h-[440px] backdrop-blur-xl">
                <div className="space-y-1 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#16A6D9]" />
                    <h3 className="text-base font-extrabold text-white">Ask about PayOps</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Instant answers about reconciliation, eTIMS, Tuma & pricing
                  </p>
                </div>

                {/* Conversation Body */}
                <div className="space-y-3 my-4 text-xs overflow-y-auto max-h-56 pr-1">
                  {assistantMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`px-4 py-2.5 rounded-2xl max-w-[85%] leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-[#16A6D9] text-slate-950 font-bold'
                            : 'bg-slate-900 border border-slate-800 text-slate-200'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Suggestion Pills */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <button
                    onClick={() => handleAssistantSend('How does reconciliation work?')}
                    className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-medium transition"
                  >
                    How does reconciliation work?
                  </button>
                  <button
                    onClick={() => handleAssistantSend('Pricing')}
                    className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-medium transition"
                  >
                    Pricing
                  </button>
                  <Link
                    to="/early-access"
                    className="px-2.5 py-1 rounded-full bg-[#16A6D9]/15 text-[#16A6D9] border border-[#16A6D9]/30 hover:bg-[#16A6D9]/25 text-[11px] font-semibold transition"
                  >
                    Join early access
                  </Link>
                </div>

                {/* Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAssistantSend();
                  }}
                  className="relative flex items-center mt-3 pt-2 border-t border-slate-800"
                >
                  <input
                    type="text"
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    placeholder="Type your question..."
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16A6D9] transition"
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
