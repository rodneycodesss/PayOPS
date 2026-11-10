import React, { useState, useEffect } from 'react';
import {
  Scale,
  Lock,
  CheckCircle2,
  History,
  Plus,
  AlertCircle,
  X,
  FileSpreadsheet,
  ArrowRightLeft,
} from 'lucide-react';
import { apiRequest } from '../services/api';

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  currency: string;
  current_balance: string;
  is_active: boolean;
}

interface TrialBalanceLine {
  code: string;
  name: string;
  type: string;
  debit: string;
  credit: string;
}

interface TrialBalance {
  tenant_id: string;
  as_of_date: string;
  lines: TrialBalanceLine[];
  total_debits: string;
  total_credits: string;
  is_balanced: boolean;
}

export const AccountingPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'chart' | 'trial_balance'>('chart');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Account Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('ASSET');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accs, tb] = await Promise.all([
        apiRequest<Account[]>('/accounting/accounts'),
        apiRequest<TrialBalance>('/accounting/trial-balance').catch(() => null),
      ]);
      setAccounts(accs);
      setTrialBalance(tb);
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/accounting/accounts', {
        method: 'POST',
        body: JSON.stringify({
          code: newCode.trim(),
          name: newName.trim(),
          account_type: newType,
          currency: 'KES',
        }),
      });
      setIsModalOpen(false);
      setNewCode('');
      setNewName('');
      loadData();
    } catch (err: any) {
      alert(`Failed to add account: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Double-Entry Accounting & Ledger</h1>
          <p className="text-sm text-slate-400 mt-1">
            Standard Kenyan SME Chart of Accounts. All postings are strictly immutable and balanced (Debits = Credits).
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            PostingService: Invariant Balanced
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1E2E48] pb-3 text-xs">
        <button
          onClick={() => setViewMode('chart')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            viewMode === 'chart'
              ? 'bg-[#11223A] text-white border border-[#1E2E48]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Chart of Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setViewMode('trial_balance')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            viewMode === 'trial_balance'
              ? 'bg-[#11223A] text-white border border-[#1E2E48]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Live Trial Balance
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading ledger accounts...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-400 text-xs flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : viewMode === 'chart' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Kenyan SME Chart of Accounts</h2>
              <span className="text-xs text-slate-400">All balances exact NUMERIC(18,2)</span>
            </div>

            <div className="overflow-x-auto text-xs font-mono">
              <table className="w-full text-left">
                <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Account Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Currency</th>
                    <th className="py-2.5 px-3 text-right">Current Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2E48]/50">
                  {accounts.map((acc) => (
                    <tr key={acc.code} className="hover:bg-[#11223A]/30 transition">
                      <td className="py-2.5 px-3 font-semibold text-emerald-400">{acc.code}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-200">{acc.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {acc.account_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{acc.currency}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                        KES {parseFloat(acc.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Real-Time Trial Balance</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  As of {trialBalance?.as_of_date || new Date().toISOString().split('T')[0]}
                </p>
              </div>
              {trialBalance && (
                <div
                  className={`px-3 py-1 rounded-lg text-xs font-mono flex items-center space-x-1.5 ${
                    trialBalance.is_balanced
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-300 border border-red-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {trialBalance.is_balanced
                      ? 'Invariance Verified: Balanced'
                      : 'Out of Balance Warning'}
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto text-xs font-mono">
              <table className="w-full text-left">
                <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Account Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Debit (KES)</th>
                    <th className="py-2.5 px-3 text-right">Credit (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2E48]/50">
                  {trialBalance?.lines.map((line) => (
                    <tr key={line.code} className="hover:bg-[#11223A]/30 transition">
                      <td className="py-2.5 px-3 font-semibold text-emerald-400">{line.code}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-200">{line.name}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[10px]">{line.type}</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        {parseFloat(line.debit) > 0
                          ? parseFloat(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        {parseFloat(line.credit) > 0
                          ? parseFloat(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {trialBalance && (
                  <tfoot className="bg-[#0E1E35] border-t-2 border-[#1E2E48] font-bold">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-white uppercase">
                        Total Sum
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400 text-sm">
                        KES {parseFloat(trialBalance.total_debits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400 text-sm">
                        KES {parseFloat(trialBalance.total_credits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Add Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E2E48] rounded-2xl shadow-2xl p-6 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2E48]">
              <div>
                <h3 className="text-base font-bold text-white">Add General Ledger Account</h3>
                <p className="text-slate-400 mt-0.5">Extend Chart of Accounts.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 mt-4">
              <div>
                <label className="block text-slate-400 mb-1">Account Code *</label>
                <input
                  type="text"
                  placeholder="e.g. 1030 or 6200"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Stanbic Clearing Account"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account Category *</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ASSET">ASSET (Current / Fixed Assets)</option>
                  <option value="LIABILITY">LIABILITY (Accounts Payable, Tax Payable)</option>
                  <option value="EQUITY">EQUITY (Retained Earnings, Share Capital)</option>
                  <option value="REVENUE">REVENUE (Operating Revenue, Sales)</option>
                  <option value="EXPENSE">EXPENSE (Direct Costs, Overhead, Fees)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
