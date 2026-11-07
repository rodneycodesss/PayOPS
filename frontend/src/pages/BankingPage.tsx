import React, { useState } from 'react';
import { Landmark, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export const BankingPage: React.FC = () => {
  const [bankAccounts] = useState([
    {
      id: 'bank-1',
      bankName: 'KCB Bank Kenya',
      accountNumber: '1129384729',
      accountName: 'Rodstar Tech Devs Ltd - Main Operating',
      branch: 'Kilindini Branch',
      currency: 'KES',
      balance: '14,820,450.00'
    },
    {
      id: 'bank-2',
      bankName: 'Equity Bank',
      accountNumber: '08102938475',
      accountName: 'Rodstar Tech Devs Ltd - Collections',
      branch: 'Community Upperhill',
      currency: 'KES',
      balance: '6,215,900.00'
    }
  ]);

  const [importSummary, setImportSummary] = useState<any | null>(null);

  const simulateImport = () => {
    setImportSummary({
      filename: 'KCB_Statement_Nov_2026.csv',
      rowsRead: 142,
      accepted: 138,
      duplicateRows: 4,
      rejected: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Banking & Statement Ingestion</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage commercial bank accounts and upload CSV bank statements with cryptographic row hashing to reject duplicate entries.
          </p>
        </div>
        <button
          onClick={simulateImport}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20"
        >
          <Upload className="w-4 h-4 mr-2" />
          <span>Import CSV Statement</span>
        </button>
      </div>

      {/* Import summary card if import executed */}
      {importSummary && (
        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-emerald-300">Bank Statement Ingestion Summary</span>
            <span className="font-mono text-slate-400">{importSummary.filename}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
            <div className="p-3 rounded-lg bg-[#0E1E35]">
              <div className="text-slate-400">Total Rows Read</div>
              <div className="text-lg font-bold text-white font-mono mt-1">{importSummary.rowsRead}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0E1E35]">
              <div className="text-emerald-400">Accepted & Logged</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-1">{importSummary.accepted}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0E1E35]">
              <div className="text-amber-400">Duplicates Detected</div>
              <div className="text-lg font-bold text-amber-400 font-mono mt-1">{importSummary.duplicateRows}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0E1E35]">
              <div className="text-red-400">Malformed / Rejected</div>
              <div className="text-lg font-bold text-white font-mono mt-1">{importSummary.rejected}</div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bankAccounts.map((acc) => (
          <div key={acc.id} className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{acc.bankName}</h2>
                  <div className="text-xs text-slate-400">{acc.branch}</div>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                ACTIVE
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono mt-4 pt-4 border-t border-[#1E2E48]/60">
              <div className="flex justify-between">
                <span className="text-slate-400">Account Number</span>
                <span className="text-slate-200">{acc.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Name</span>
                <span className="text-slate-300 font-sans truncate max-w-[200px]">{acc.accountName}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Current Balance</span>
                <span className="text-emerald-400 font-bold text-base">KES {acc.balance}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
