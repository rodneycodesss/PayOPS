import React, { useState } from 'react';
import { Scale, Lock, CheckCircle2, History, Plus } from 'lucide-react';

export const AccountingPage: React.FC = () => {
  const [accounts] = useState([
    { code: '1000', name: 'Petty Cash', type: 'ASSET', balance: '25,000.00' },
    { code: '1010', name: 'M-PESA Clearing', type: 'ASSET', balance: '342,850.00' },
    { code: '1020', name: 'Bank - Operating Account (KCB)', type: 'ASSET', balance: '14,820,450.00' },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET', balance: '1,240,500.00' },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', balance: '840,000.00' },
    { code: '2100', name: 'VAT Output Tax Payable (KRA)', type: 'LIABILITY', balance: '412,300.00' },
    { code: '2110', name: 'Customer Overpayment Credit', type: 'LIABILITY', balance: '15,700.00' },
    { code: '3000', name: 'Retained Earnings', type: 'EQUITY', balance: '9,500,000.00' },
    { code: '4000', name: 'Operating Revenue', type: 'REVENUE', balance: '6,845,200.00' },
    { code: '6000', name: 'Operating Expenses', type: 'EXPENSE', balance: '1,180,000.00' },
    { code: '6100', name: 'M-PESA / Bank Processing Fees', type: 'EXPENSE', balance: '45,600.00' },
  ]);

  return (
    <div className="space-y-6">
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
          <button className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-[#11223A] border border-[#1E2E48] text-slate-200 text-xs font-medium hover:text-white transition">
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            Period Close
          </button>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
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
                  <td className="py-2.5 px-3 font-sans text-white font-medium">{acc.name}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        acc.type === 'ASSET'
                          ? 'bg-blue-500/10 text-blue-400'
                          : acc.type === 'LIABILITY'
                          ? 'bg-amber-500/10 text-amber-400'
                          : acc.type === 'EQUITY'
                          ? 'bg-purple-500/10 text-purple-400'
                          : acc.type === 'REVENUE'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {acc.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">KES</td>
                  <td className="py-2.5 px-3 text-right text-slate-100 font-bold">KES {acc.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
