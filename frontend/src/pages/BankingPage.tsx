import React, { useState, useEffect, useRef } from 'react';
import {
  Landmark,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { apiRequest } from '../services/api';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  branch?: string;
  currency: string;
  current_balance: string;
  is_active: boolean;
}

interface BankImportSummary {
  bank_account_id: string;
  filename: string;
  total_rows: number;
  accepted_rows: number;
  duplicate_rows: number;
  rejected_rows: number;
  rejection_reasons: Array<{ line_number: number; reason: string }>;
}

export const BankingPage: React.FC = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<BankImportSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // New Account Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bankName, setBankName] = useState('KCB Bank Kenya');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [branch, setBranch] = useState('Kilindini Branch');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<BankAccount[]>('/banking/accounts');
      setBankAccounts(data);
      if (data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bank accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/banking/accounts', {
        method: 'POST',
        body: JSON.stringify({
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          branch: branch || undefined,
          currency: 'KES',
        }),
      });
      setIsCreateOpen(false);
      setAccountNumber('');
      setAccountName('');
      loadAccounts();
    } catch (err: any) {
      alert(`Failed to add bank account: ${err.message}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) return;

    setIsImporting(true);
    setImportSummary(null);

    const formData = new FormData();
    formData.append('csv_file', file);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/banking/accounts/${selectedAccountId}/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: 'Import failed' }));
        throw new Error(errJson.detail || `Upload failed with HTTP ${res.status}`);
      }

      const summary: BankImportSummary = await res.json();
      setImportSummary(summary);
      loadAccounts();
    } catch (err: any) {
      alert(`Statement import error: ${err.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Banking & Statement Ingestion</h1>
          <p className="text-sm text-slate-400 mt-1">
            Commercial bank accounts with cryptographic SHA-256 row hashing to reject duplicate entries and capture statement feeds.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center px-3.5 py-2 rounded-lg bg-[#11223A] border border-[#1E2E48] text-slate-200 text-xs font-medium hover:text-white transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add Bank Account</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={bankAccounts.length === 0 || isImporting}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            <span>{isImporting ? 'Hashing & Ingesting...' : 'Import CSV Statement'}</span>
          </button>
        </div>
      </div>

      {/* Import summary card if import executed */}
      {importSummary && (
        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-emerald-300">Bank Statement Ingestion Summary</span>
            <span className="font-mono text-slate-400">{importSummary.filename}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 font-mono">
            <div className="p-3 rounded-lg bg-[#0E1E35]">
              <div className="text-slate-400 font-sans">Total Rows Read</div>
              <div className="text-lg font-bold text-white mt-1">{importSummary.total_rows}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0E1E35]">
              <div className="text-emerald-400 font-sans">Accepted & Logged</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">{importSummary.accepted_rows}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0E1E35]">
              <div className="text-amber-400 font-sans">Duplicates Detected</div>
              <div className="text-lg font-bold text-amber-400 mt-1">{importSummary.duplicate_rows}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0E1E35]">
              <div className="text-red-400 font-sans">Malformed / Rejected</div>
              <div className="text-lg font-bold text-white mt-1">{importSummary.rejected_rows}</div>
            </div>
          </div>
        </div>
      )}

      {/* Account Selector if multiple */}
      {bankAccounts.length > 0 && (
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Target Account for Statement Upload:</span>
          <select
            value={selectedAccountId || ''}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#0B192C] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500 font-sans"
          >
            {bankAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.bank_name} - {acc.account_number} ({acc.account_name})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Bank Accounts Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Loading bank accounts...</div>
      ) : error ? (
        <div className="py-8 text-center text-red-400 text-xs flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : bankAccounts.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#0B192C] border border-[#1E2E48] text-center text-xs text-slate-400">
          <Landmark className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p>No business bank accounts configured yet.</p>
          <p className="mt-1 text-slate-500">
            Click "Add Bank Account" to configure KCB, Equity, Stanbic, or NCBA accounts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankAccounts.map((acc) => (
            <div
              key={acc.id}
              className={`p-6 rounded-xl bg-[#0B192C] border transition ${
                selectedAccountId === acc.id ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'border-[#1E2E48]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">{acc.bank_name}</h2>
                    <div className="text-xs text-slate-400">{acc.branch || 'Main Branch'}</div>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono mt-4 pt-4 border-t border-[#1E2E48]/60">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Account Number</span>
                  <span className="text-slate-200">{acc.account_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Account Name</span>
                  <span className="text-slate-300 font-sans truncate max-w-[200px]">{acc.account_name}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400 font-sans">Current Balance</span>
                  <span className="text-emerald-400 font-bold text-base">
                    KES {parseFloat(acc.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Add Bank Account */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E2E48] rounded-2xl shadow-2xl p-6 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2E48]">
              <div>
                <h3 className="text-base font-bold text-white">Add Bank Account</h3>
                <p className="text-slate-400 mt-0.5">Register corporate Kenyan bank account.</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 mt-4">
              <div>
                <label className="block text-slate-400 mb-1">Bank Name *</label>
                <input
                  type="text"
                  placeholder="e.g. KCB Bank Kenya, Equity Bank, Stanbic"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 1129384729"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account Title / Entity Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rodstar Tech Devs Ltd - Main Operating"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kilindini Branch or Upperhill"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
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
