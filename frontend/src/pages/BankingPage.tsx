import React, { useState, useRef } from 'react';
import { Landmark, Upload, CheckCircle2, Plus, X } from 'lucide-react';
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
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    {
      id: 'b-1',
      bank_name: 'KCB Bank Kenya',
      account_number: '1129384729',
      account_name: 'Rodstar Tech Devs Ltd - Main Operating',
      branch: 'Kilindini Branch',
      currency: 'KES',
      current_balance: '14,820,450.00',
    },
    {
      id: 'b-2',
      bank_name: 'Equity Bank',
      account_number: '08102938475',
      account_name: 'Rodstar Tech Devs Ltd - Collections',
      branch: 'Upperhill Branch',
      currency: 'KES',
      current_balance: '6,215,900.00',
    },
  ]);

  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSimulateImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      setImportSummary({
        filename: 'KCB_Bank_Feed_Nov_2026.csv',
        totalRows: 142,
        accepted: 138,
        duplicates: 4,
        rejected: 0,
      });
    }, 1200);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Banking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Commercial bank accounts with SHA-256 row hashing to reject duplicate entries.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="px-6 py-3 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold text-sm transition shadow-md shadow-[#16A6D9]/20 flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>{isImporting ? 'Ingesting Statement...' : 'Import statement'}</span>
        </button>
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
              <div className="text-xs text-amber-700">Duplicates Rejected</div>
              <div className="text-2xl font-extrabold text-amber-800 mt-1">{importSummary.duplicates}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50">
              <div className="text-xs text-slate-500">Malformed Rows</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{importSummary.rejected}</div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bankAccounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-slate-100 text-[#16A6D9]">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-950">{acc.bank_name}</h2>
                  <div className="text-xs text-slate-500">{acc.branch}</div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Account Number</span>
                <span className="font-mono font-bold text-slate-900">{acc.account_number}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Account Title</span>
                <span className="text-slate-800 font-medium truncate max-w-[220px]">{acc.account_name}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-600 font-medium">Current Balance</span>
                <span className="text-2xl font-extrabold text-[#16A6D9] font-sans">
                  KES {acc.current_balance}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
