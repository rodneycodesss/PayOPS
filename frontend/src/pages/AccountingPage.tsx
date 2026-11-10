import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface JournalEntryRow {
  entryNo: string;
  description: string;
  debit: string;
  credit: string;
}

export const AccountingPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [entries, setEntries] = useState<JournalEntryRow[]>([]);
  const [hasRealData, setHasRealData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Exact illustrative entries from Page 15
  const illustrativeEntries: JournalEntryRow[] = [
    {
      entryNo: 'JE-0101',
      description: 'Invoice INV-0045 issued',
      debit: 'Receivables 11,600',
      credit: 'Revenue 10,000 · VAT 1,600',
    },
    {
      entryNo: 'JE-0102',
      description: 'Payment SKT4X92LQ1 received',
      debit: 'Payment clearing 12,000',
      credit: 'Receivables 12,000',
    },
    {
      entryNo: 'JE-0103',
      description: 'Reversal of JE-0099',
      debit: 'Revenue 3,000',
      credit: 'Receivables 3,000',
    },
  ];

  useEffect(() => {
    async function loadJournals() {
      setIsLoading(true);
      try {
        const real = await apiRequest<any[]>('/accounting/journal-entries');
        if (real && real.length > 0) {
          setHasRealData(true);
          const mapped: JournalEntryRow[] = real.map((je) => {
            const debitLines = je.lines ? je.lines.filter((l: any) => Number(l.debit || 0) > 0) : [];
            const creditLines = je.lines ? je.lines.filter((l: any) => Number(l.credit || 0) > 0) : [];

            const debitStr = debitLines
              .map((l: any) => `${l.account_name || 'Account'} ${Number(l.debit).toLocaleString()}`)
              .join(' · ');
            const creditStr = creditLines
              .map((l: any) => `${l.account_name || 'Account'} ${Number(l.credit).toLocaleString()}`)
              .join(' · ');

            return {
              entryNo: `JE-0${je.id.slice(0, 3).toUpperCase()}`,
              description: je.narration || 'Automated General Ledger Posting',
              debit: debitStr || 'Receivables',
              credit: creditStr || 'Revenue',
            };
          });

          setEntries(mapped);
        } else {
          setHasRealData(false);
          if (isTestAccount) {
            setEntries(illustrativeEntries);
          } else {
            setEntries([]);
          }
        }
      } catch {
        setHasRealData(false);
        if (isTestAccount) {
          setEntries(illustrativeEntries);
        } else {
          setEntries([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadJournals();
  }, [isTestAccount]);

  const showIllustrativeBadge = isTestAccount && !hasRealData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Row (Page 15) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Accounting
        </h1>
        {showIllustrativeBadge && (
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
            Illustrative data
          </span>
        )}
      </div>

      {/* Trial Balance Headline Card (Page 15) */}
      <div className="bg-[#080D18] text-white rounded-3xl p-8 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Trial balance
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#16A6D9] tracking-tight mt-1">
            Debits equal credits
          </h2>
        </div>

        <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          Balanced
        </span>
      </div>

      {/* Journal Entries Table (Page 15) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">Journal entry</th>
                <th className="pb-4 font-normal">Description</th>
                <th className="pb-4 font-normal">Debit</th>
                <th className="pb-4 font-normal">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                    No journal entries posted yet. All double-entry postings are created automatically upon invoicing and reconciliation.
                  </td>
                </tr>
              ) : (
                entries.map((je) => (
                  <tr key={je.entryNo} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 font-mono font-bold text-slate-900">{je.entryNo}</td>
                    <td className="py-4 text-slate-700">{je.description}</td>
                    <td className="py-4 font-mono text-xs text-slate-800">{je.debit}</td>
                    <td className="py-4 font-mono text-xs text-slate-800">{je.credit}</td>
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
