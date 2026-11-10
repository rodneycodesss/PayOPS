import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Play,
  Clock,
  Check,
  X,
  History,
} from 'lucide-react';
import { apiRequest } from '../services/api';

interface ReconciliationRun {
  id: string;
  run_type: string;
  date_window_days: number;
  total_processed: number;
  matched_count: number;
  unmatched_count: number;
  created_at: string;
}

interface ReconciliationException {
  id: string;
  payment_id?: string;
  bank_transaction_id?: string;
  exception_type: string;
  status: string;
  reason: string;
  candidate_invoice_ids?: any;
  created_at: string;
}

export const ReconciliationPage: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [runs, setRuns] = useState<ReconciliationRun[]>([]);
  const [exceptions, setExceptions] = useState<ReconciliationException[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Exception Resolution Modal State
  const [selectedException, setSelectedException] = useState<ReconciliationException | null>(null);
  const [resolutionAction, setResolutionAction] = useState('MANUALLY_ALLOCATED');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [runsData, exceptionsData] = await Promise.all([
        apiRequest<ReconciliationRun[]>('/reconciliation/runs').catch(() => []),
        apiRequest<ReconciliationException[]>('/reconciliation/exceptions').catch(() => []),
      ]);
      setRuns(runsData);
      setExceptions(exceptionsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load reconciliation state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerRun = async () => {
    setIsRunning(true);
    try {
      const res = await apiRequest<ReconciliationRun>('/reconciliation/runs', {
        method: 'POST',
        body: JSON.stringify({ date_window_days: 3 }),
      });
      showToast(
        `Reconciliation completed: ${res.matched_count} matched, ${res.unmatched_count} exceptions`
      );
      await loadData();
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleResolveException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedException) return;

    try {
      await apiRequest(`/reconciliation/exceptions/${selectedException.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          action: resolutionAction,
          notes: resolutionNotes,
        }),
      });
      setSelectedException(null);
      setResolutionNotes('');
      showToast('Exception resolved with audit trail');
      await loadData();
    } catch (err: any) {
      alert(`Resolution failed: ${err.message}`);
    }
  };

  const latestRun = runs[0];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
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
          <span>{isRunning ? 'Running Rules Engine...' : 'Run Reconciliation Engine'}</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Exception Queue (Manual Review Required)</h2>
            <p className="text-xs text-slate-400">Strict invariant: Ambiguous candidates never auto-allocate</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {latestRun
              ? `Last Run: ${new Date(latestRun.created_at).toLocaleString()}`
              : 'No runs recorded yet'}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading exception queue...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-400 text-xs flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : exceptions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-emerald-400 font-semibold">Exception Queue is Empty</p>
            <p className="mt-0.5 text-slate-500">
              All transactions have been cleanly matched or no ambiguous entries are pending review.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left font-mono">
              <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Exception ID</th>
                  <th className="py-2.5 px-3">Reference / Origin</th>
                  <th className="py-2.5 px-3">Reason / Ambiguity Details</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created At</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2E48]/50">
                {exceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-[#11223A]/30 transition">
                    <td className="py-2.5 px-3 font-semibold text-white">{ex.id.substring(0, 8)}...</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {ex.payment_id ? `Payment: ${ex.payment_id.substring(0, 8)}` : `Bank Tx: ${ex.bank_transaction_id?.substring(0, 8)}`}
                    </td>
                    <td className="py-2.5 px-3 text-amber-300 font-sans max-w-md">
                      {ex.reason}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20">
                        {ex.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(ex.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {ex.status === 'OPEN' && (
                        <button
                          onClick={() => setSelectedException(ex)}
                          className="px-3 py-1 rounded bg-[#11223A] hover:bg-emerald-500 hover:text-white border border-[#1E2E48] text-slate-300 font-sans transition"
                        >
                          Resolve Manually
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Resolve Exception */}
      {selectedException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E2E48] rounded-2xl shadow-2xl p-6 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2E48]">
              <div>
                <h3 className="text-base font-bold text-white">Resolve Reconciliation Exception</h3>
                <p className="text-slate-400 mt-0.5">Audit-trailed manual intervention.</p>
              </div>
              <button
                onClick={() => setSelectedException(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
              <div className="font-semibold text-amber-300">Ambiguity Reason:</div>
              <div className="mt-1 text-[11px]">{selectedException.reason}</div>
            </div>

            <form onSubmit={handleResolveException} className="space-y-4 mt-4">
              <div>
                <label className="block text-slate-400 mb-1">Resolution Action *</label>
                <select
                  value={resolutionAction}
                  onChange={(e) => setResolutionAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="MANUALLY_ALLOCATED">Manually Allocated (Matched to Invoice)</option>
                  <option value="OVERPAYMENT_CREDITED">Credited to Customer Balance</option>
                  <option value="DISMISSED_NON_REVENUE">Dismissed as Non-Revenue (Internal Transfer / Refund)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Auditor & Justification Notes *</label>
                <textarea
                  rows={3}
                  placeholder="Explain why this allocation is correct, receipt verification, or banking proof..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedException(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
