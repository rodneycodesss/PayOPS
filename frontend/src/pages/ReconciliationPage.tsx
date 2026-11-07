import React, { useState } from 'react';
import { GitCompare, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Play } from 'lucide-react';

export const ReconciliationPage: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState('Today at 02:00 UTC (Scheduled Daily Job)');

  const triggerRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setLastRun('Just now (Manual Execution)');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reconciliation Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic multi-tier matching of M-PESA & Bank transactions to invoices with zero ambiguous auto-allocation.
          </p>
        </div>
        <button
          onClick={triggerRun}
          disabled={isRunning}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <Play className="w-4 h-4 mr-2" />
          <span>{isRunning ? 'Running Rules Engine...' : 'Run Reconciliation Run'}</span>
        </button>
      </div>

      {/* 5 Matching Priority Tiers Info Box */}
      <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">
          Domain Matching Rule Priority Hierarchy
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#0E1E35] border border-emerald-500/40">
            <span className="font-mono text-emerald-400 font-bold">Tier 1</span>
            <div className="font-semibold text-white mt-1">Exact Tx Ref</div>
            <div className="text-[11px] text-slate-400 mt-0.5">M-PESA receipt matches checkout reference</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0E1E35] border border-[#1E2E48]">
            <span className="font-mono text-emerald-400 font-bold">Tier 2</span>
            <div className="font-semibold text-white mt-1">Invoice Ref</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Account reference equals invoice number</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0E1E35] border border-[#1E2E48]">
            <span className="font-mono text-emerald-400 font-bold">Tier 3</span>
            <div className="font-semibold text-white mt-1">Amount + Customer</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Identical amount and customer identifier</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0E1E35] border border-[#1E2E48]">
            <span className="font-mono text-emerald-400 font-bold">Tier 4</span>
            <div className="font-semibold text-white mt-1">Amount + Window</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Exact amount within configurable ±3 days</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0E1E35] border border-amber-500/40">
            <span className="font-mono text-amber-400 font-bold">Tier 5</span>
            <div className="font-semibold text-white mt-1">Exception Queue</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Ambiguous matches diverted to manual review</div>
          </div>
        </div>
      </div>

      {/* Reconciliation Exception Queue */}
      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Exception Queue (Manual Review Required)</h2>
            <p className="text-xs text-slate-400">Strict invariant: Ambiguous candidates never auto-allocate</p>
          </div>
          <span className="text-xs text-slate-400">Last Engine Run: {lastRun}</span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left font-mono">
            <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Candidate Payment</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Reason / Ambiguity</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E48]/50">
              <tr className="hover:bg-[#11223A]/30 transition">
                <td className="py-2.5 px-3 font-semibold text-white">QKH9921041 (Jane M.)</td>
                <td className="py-2.5 px-3 text-emerald-400">KES 8,000.00</td>
                <td className="py-2.5 px-3 text-amber-400 font-sans">
                  Multiple open invoices match candidate amount (INV-004 and INV-009)
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-sans">
                    AMBIGUOUS_MATCH
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button className="px-3 py-1 rounded bg-[#11223A] hover:bg-emerald-500 hover:text-white border border-[#1E2E48] text-slate-300 font-sans transition">
                    Resolve Manually
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
