import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

export const OverviewPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    collectedToday: '184,500',
    outstanding: '912,300',
    needsReview: 7,
    reconciliationRate: 96,
  });

  // Attention items
  const attentionItems = [
    { ref: 'SKT2C77PD3', amount: '8,000', reason: 'Ambiguous match (two invoices match amount)' },
    { ref: 'SKT9K10WA5', amount: '3,200', reason: 'Customer name mismatch on account reference' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Top Header Row (Page 4) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            {new Date().toLocaleDateString('en-KE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
            Good morning, {user?.full_name?.split(' ')[0] || 'Rodney'}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative w-64 sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search payments, invoices"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#16A6D9] focus:ring-1 focus:ring-[#16A6D9] shadow-sm"
            />
          </div>
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
            Illustrative data
          </span>
        </div>
      </div>

      {/* Top 3 KPI Cards (Page 4) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Card 1: Collected today (Dark Navy Card - 6 cols) */}
        <div className="md:col-span-6 bg-[#080D18] text-white rounded-3xl p-8 flex flex-col justify-between shadow-sm min-h-[200px]">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Collected today
            </span>
            <div className="text-4xl sm:text-5xl font-extrabold text-[#16A6D9] tracking-tight mt-2 font-sans">
              KSh {stats.collectedToday}
            </div>
          </div>

          {/* Sparkline curve visual */}
          <div className="pt-6">
            <svg viewBox="0 0 400 60" className="w-full h-12 overflow-visible">
              <path
                d="M0 45 Q 80 48, 140 25 T 260 30 T 340 10 T 400 15"
                fill="none"
                stroke="#16A6D9"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Outstanding (White Card - 3 cols) */}
        <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-8 flex flex-col justify-between shadow-sm min-h-[200px]">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mt-2">
              KSh {stats.outstanding}
            </div>
          </div>
          <div className="text-xs text-slate-400 pt-4">
            Awaiting customer settlement
          </div>
        </div>

        {/* Card 3: Needs review (White Card - 3 cols) */}
        <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-8 flex flex-col justify-between shadow-sm min-h-[200px]">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Needs review
            </span>
            <div className="text-4xl sm:text-5xl font-extrabold text-amber-500 tracking-tight mt-2">
              {stats.needsReview}
            </div>
          </div>
          <div className="text-xs text-amber-600 font-medium pt-4">
            Ambiguous matches in queue
          </div>
        </div>
      </div>

      {/* Middle Section: Collections & Reconciliation Health (Page 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Collections, last 30 days (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-950">
              Collections, last 30 days
            </h2>
          </div>

          {/* Area Chart Visual */}
          <div className="h-64 w-full pt-4">
            <svg viewBox="0 0 600 200" className="w-full h-full">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A6D9" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#16A6D9" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                d="M0 160 Q 60 155, 120 120 T 240 140 T 360 80 T 480 60 T 600 40 L 600 200 L 0 200 Z"
                fill="url(#areaGradient)"
              />
              <path
                d="M0 160 Q 60 155, 120 120 T 240 140 T 360 80 T 480 60 T 600 40"
                fill="none"
                stroke="#16A6D9"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Reconciliation health (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-8 flex flex-col justify-between shadow-sm">
          <h2 className="text-base font-bold text-slate-950">
            Reconciliation health
          </h2>

          <div className="flex flex-col items-center justify-center my-6">
            {/* Donut percentage indicator */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#16A6D9]"
                  strokeDasharray="96, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold text-slate-950 font-sans">
                  {stats.reconciliationRate}%
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-2 text-center">
              of payments reconciled
            </p>
          </div>

          <div className="text-[11px] text-slate-400 text-center">
            0 ambiguous payments auto-allocated
          </div>
        </div>
      </div>

      {/* Bottom Row: Needs your attention & eTIMS pipeline (Page 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Needs your attention (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-950">
            Needs your attention
          </h2>

          <div className="space-y-3 font-mono text-xs">
            {attentionItems.map((item) => (
              <div
                key={item.ref}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900">{item.ref}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="text-slate-700 font-semibold">KSh {item.amount}</span>
                  <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                    {item.reason}
                  </div>
                </div>
                <button
                  onClick={() => navigate('/reconciliation')}
                  className="px-4 py-2 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-sans text-xs font-semibold transition"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* eTIMS pipeline (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-950">
            eTIMS pipeline
          </h2>

          {/* Segmented bar */}
          <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
            <div className="bg-[#16A6D9] h-full" style={{ width: '30%' }}></div>
            <div className="bg-amber-400 h-full" style={{ width: '20%' }}></div>
            <div className="bg-[#080D18] h-full" style={{ width: '10%' }}></div>
            <div className="bg-emerald-500 h-full" style={{ width: '40%' }}></div>
          </div>

          {/* Breakdown Pills */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A6D9]"></span>
              <span>Draft <b>3</b></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>Pending <b>2</b></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#080D18]"></span>
              <span>Under review <b>1</b></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Recorded manually <b>4</b></span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400">
            Manual review mode enabled · Compliant Section 2 Rule 9 invariant
          </div>
        </div>
      </div>
    </div>
  );
};
