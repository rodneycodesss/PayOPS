import React, { useState, useRef, useEffect } from 'react';
import { Landmark, Upload, CheckCircle2, Plus, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  branch?: string;
  currency: string;
  current_balance: string;
}

export const BankingPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Bank Form state
  const [bankName, setBankName] = useState('KCB Bank Kenya');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [branch, setBranch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Illustrative accounts for test account
  const illustrativeAccounts: BankAccount[] = [
    {
      id: 'b-1',
      bank_name: 'KCB Bank Kenya',
      account_number: '1129384729',
      account_name: 'Main Operating Account',
      branch: 'Kilindini Branch',
      currency: 'KES',
      current_balance: '14,820,450.00',
    },
    {
      id: 'b-2',
      bank_name: 'Equity Bank',
      account_number: '08102938475',
      account_name: 'Collections Account',
      branch: 'Upperhill Branch',
      currency: 'KES',
      current_balance: '6,215,900.00',
    },
  ];

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const real = await apiRequest<any[]>('/banking/accounts');
      if (real && real.length > 0) {
        setHasRealData(true);
        const mapped: BankAccount[] = real.map((b) => ({
          id: b.id,
          bank_name: b.bank_name,
          account_number: b.account_number,
          account_name: b.account_name,
          branch: b.branch,
          currency: b.currency || 'KES',
          current_balance: Number(b.current_balance || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
        }));
        setBankAccounts(mapped);
      } else {
        setHasRealData(false);
        if (isTestAccount) {
          setBankAccounts(illustrativeAccounts);
        } else {
          setBankAccounts([]);
        }
      }
    } catch {
      setHasRealData(false);
      if (isTestAccount) {
        setBankAccounts(illustrativeAccounts);
      } else {
        setBankAccounts([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [isTestAccount]);

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
      await fetchAccounts();
      setIsModalOpen(false);
      setAccountNumber('');
      setAccountName('');
      setBranch('');
    } catch (err: any) {
      alert(`Failed to add bank account: ${err.message}`);
    }
  };

  const handleSimulateImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      setImportSummary({
        filename: 'Bank_Statement_Feed_Nov_2026.csv',
        totalRows: 142,
        accepted: 138,
        duplicates: 4,
        rejected: 0,
      });
    }, 1200);
  };

  const showIllustrativeBadge = isTestAccount && !hasRealData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleSimulateImport}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Banking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Commercial bank accounts with SHA-256 row hashing to reject duplicate entries.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {showIllustrativeBadge && (
            <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
              Illustrative data
            </span>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition shadow-sm flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add account</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="px-6 py-3 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold text-sm transition shadow-md shadow-[#16A6D9]/20 flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>{isImporting ? 'Ingesting Statement...' : 'Import statement'}</span>
          </button>
        </div>
      </div>

      {/* Import summary card */}
      {importSummary && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-bold text-slate-950 text-sm">Statement Ingestion Summary</span>
            <span className="font-mono text-xs text-slate-500">{importSummary.filename}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 font-sans">
            <div className="p-4 rounded-2xl bg-slate-50">
              <div className="text-xs text-slate-500">Total Rows Read</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{importSummary.totalRows}</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50">
              <div className="text-xs text-emerald-700">Accepted & Logged</div>
              <div className="text-2xl font-extrabold text-emerald-800 mt-1">{importSummary.accepted}</div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50">
              <div className="text-xs text-amber-700">Deduplicated (Skipped)</div>
              <div className="text-2xl font-extrabold text-amber-800 mt-1">{importSummary.duplicates}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50">
              <div className="text-xs text-slate-500">Malformed (Rejected)</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{importSummary.rejected}</div>
            </div>
          </div>
        </div>
      )}

      {/* Bank accounts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bankAccounts.length === 0 ? (
          <div className="col-span-2 py-16 text-center bg-white border border-slate-200/80 rounded-3xl p-8 space-y-3">
            <Landmark className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="font-bold text-slate-900 text-sm">No bank accounts linked yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your commercial bank accounts or upload bank statement CSV files to ingest and reconcile your banking transactions.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-[#16A6D9] font-bold text-xs hover:underline pt-2 block mx-auto"
            >
              Add your first bank account
            </button>
          </div>
        ) : (
          bankAccounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between space-y-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Landmark className="w-5 h-5 text-[#16A6D9]" />
                    <h3 className="font-bold text-slate-950 text-base">{acc.bank_name}</h3>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {acc.account_name} {acc.branch && `· ${acc.branch}`}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  Active
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                  Account Number
                </span>
                <span className="text-base font-mono font-bold text-slate-800">{acc.account_number}</span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-end justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                    Current Balance
                  </span>
                  <div className="text-2xl font-extrabold text-slate-950 font-sans mt-0.5">
                    KES {acc.current_balance}
                  </div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                >
                  Import Feed
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Bank Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-950">Add Bank Account</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bank Institution</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                >
                  <option value="KCB Bank Kenya">KCB Bank Kenya</option>
                  <option value="Equity Bank">Equity Bank</option>
                  <option value="Co-operative Bank of Kenya">Co-operative Bank of Kenya</option>
                  <option value="Standard Chartered Kenya">Standard Chartered Kenya</option>
                  <option value="NCBA Bank">NCBA Bank</option>
                  <option value="Stanbic Bank Kenya">Stanbic Bank Kenya</option>
                  <option value="ABSA Bank Kenya">ABSA Bank Kenya</option>
                  <option value="Diamond Trust Bank (DTB)">Diamond Trust Bank (DTB)</option>
                  <option value="I&M Bank">I&M Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Operating Current Account"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="1102938475"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Branch (Optional)</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="Kilindini Branch"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold transition"
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
