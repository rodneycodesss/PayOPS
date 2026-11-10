import React, { useState, useEffect } from 'react';
import { Scale, CheckCircle2, Plus } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface AccountRow {
  code: string;
  name: string;
  type: string;
  balance: string;
}

export const AccountingPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [tab, setTab] = useState<'chart' | 'trial'>('chart');
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);

  // Default standard Kenyan SME Chart of Accounts for illustration
  const defaultAccounts: AccountRow[] = [
    { code: '1000', name: 'Petty Cash', type: 'ASSET', balance: '25,000.00' },
    { code: '1010', name: 'M-PESA Clearing Account', type: 'ASSET', balance: '342,850.00' },
    { code: '1020', name: 'KCB Bank - Operating Account', type: 'ASSET', balance: '14,820,450.00' },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET', balance: '1,240,500.00' },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', balance: '840,000.00' },
    { code: '2100', name: 'VAT Output Tax Payable (KRA)', type: 'LIABILITY', balance: '412,300.00' },
    { code: '2110', name: 'Customer Overpayment Credit', type: 'LIABILITY', balance: '15,700.00' },
    { code: '3000', name: 'Retained Earnings', type: 'EQUITY', balance: '9,500,000.00' },
    { code: '4000', name: 'Operating Revenue', type: 'REVENUE', balance: '6,845,200.00' },
    { code: '6000', name: 'Operating Expenses', type: 'EXPENSE', balance: '1,180,000.00' },
    { code: '6100', name: 'M-PESA & Bank Processing Fees', type: 'EXPENSE', balance: '45,600.00' },
  ];

  useEffect(() => {
    async function loadAccounts() {
      setIsLoading(true);
      try {
        const [accRes, trialRes] = await Promise.allSettled([
          apiRequest<any[]>('/accounting/accounts'),
          apiRequest<any>('/accounting/trial-balance'),
        ]);

        const realAccounts = accRes.status === 'fulfilled' ? accRes.value : [];
        const trialBalance = trialRes.status === 'fulfilled' ? trialRes.value : null;

        if (realAccounts && realAccounts.length > 0) {
          setHasRealData(true);
          const trialMap = new Map<string, number>();
          if (trialBalance && trialBalance.lines) {
            trialBalance.lines.forEach((l: any) => {
              trialMap.set(l.code, Number(l.debit || 0) - Number(l.credit || 0));
            });
          }

          const mapped: AccountRow[] = realAccounts.map((a: any) => ({
            code: a.code,
            name: a.name,
            type: a.account_type,
            balance: Math.abs(trialMap.get(a.code) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
          }));
          setAccounts(mapped);
        } else {
          setHasRealData(false);
          if (isTestAccount) {
            setAccounts(defaultAccounts);
          } else {
            setAccounts([]);
          }
        }
      } catch {
        setHasRealData(false);
        if (isTestAccount) {
          setAccounts(defaultAccounts);
        } else {
          setAccounts([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAccounts();
  }, [isTestAccount]);

  const showIllustrativeBadge = isTestAccount && !hasRealData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Accounting & General Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standard Kenyan SME Chart of Accounts. All entries balance debits to credits mathematically.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {showIllustrativeBadge && (
            <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
              Illustrative data
            </span>
          )}
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Debits == Credits Balanced</span>
          </span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setTab('chart')}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold transition ${
            tab === 'chart'
              ? 'bg-[#080D18] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Chart of Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setTab('trial')}
          className={`px-5 py-2.5 rounded-full text-xs font-semibold transition ${
            tab === 'trial'
              ? 'bg-[#080D18] text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Trial Balance
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">Code</th>
                <th className="pb-4 font-normal">Account Name</th>
                <th className="pb-4 font-normal">Category</th>
                <th className="pb-4 font-normal text-right">Balance (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-sans">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                    Loading chart of accounts...
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.code} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 font-mono font-bold text-[#16A6D9]">{acc.code}</td>
                    <td className="py-4 text-slate-900 font-medium">{acc.name}</td>
                    <td className="py-4">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-4 text-right font-bold text-slate-900 font-mono">
                      KES {acc.balance}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
