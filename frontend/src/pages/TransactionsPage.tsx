import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface TransactionRow {
  id: string;
  source: string;
  reference: string;
  amount: string;
  match: string;
  matchStatus: 'matched' | 'pending' | 'partial' | 'review';
}

export const TransactionsPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [hasRealData, setHasRealData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Exact illustrative data from Page 11
  const illustrativeTransactions: TransactionRow[] = [
    {
      id: 'tx-1',
      source: 'M-PESA',
      reference: 'SKT4X92LQ1',
      amount: '12,000',
      match: 'INV-0042',
      matchStatus: 'matched',
    },
    {
      id: 'tx-2',
      source: 'Bank',
      reference: 'BNK-20931',
      amount: '48,000',
      match: 'Pending',
      matchStatus: 'pending',
    },
    {
      id: 'tx-3',
      source: 'M-PESA',
      reference: 'SKT7B41MZ8',
      amount: '5,500',
      match: 'Partial, INV-0045',
      matchStatus: 'partial',
    },
    {
      id: 'tx-4',
      source: 'M-PESA',
      reference: 'SKT2C77PD3',
      amount: '8,000',
      match: 'Needs review',
      matchStatus: 'review',
    },
  ];

  useEffect(() => {
    async function loadTransactions() {
      setIsLoading(true);
      try {
        const [payRes, recRes] = await Promise.allSettled([
          apiRequest<any[]>('/payments/'),
          apiRequest<any[]>('/reconciliation/matches'),
        ]);

        const payments = payRes.status === 'fulfilled' ? payRes.value : [];
        const matches = recRes.status === 'fulfilled' ? recRes.value : [];

        if (payments && payments.length > 0) {
          setHasRealData(true);
          const mapped: TransactionRow[] = payments.map((p) => {
            const foundMatch = matches.find((m: any) => m.payment_id === p.id);
            let matchLabel = 'Pending';
            let status: TransactionRow['matchStatus'] = 'pending';

            if (foundMatch) {
              matchLabel = foundMatch.invoice_id ? `INV-${foundMatch.invoice_id.slice(0, 4)}` : 'Matched';
              status = 'matched';
            } else if (p.status === 'FAILED') {
              matchLabel = 'Failed';
              status = 'review';
            } else if (p.unallocated_amount && Number(p.unallocated_amount) < Number(p.amount)) {
              matchLabel = 'Partial';
              status = 'partial';
            }

            return {
              id: p.id,
              source: (p.provider === 'TUMA_MPESA' || p.provider === 'TUMA' || p.provider === 'DARAJA') ? 'M-PESA' : p.provider || 'M-PESA',
              reference: p.provider_reference || p.checkout_request_id || p.id.slice(0, 10).toUpperCase(),
              amount: Number(p.amount || 0).toLocaleString(),
              match: matchLabel,
              matchStatus: status,
            };
          });

          setTransactions(mapped);
        } else {
          setHasRealData(false);
          if (isTestAccount) {
            setTransactions(illustrativeTransactions);
          } else {
            setTransactions([]);
          }
        }
      } catch {
        setHasRealData(false);
        if (isTestAccount) {
          setTransactions(illustrativeTransactions);
        } else {
          setTransactions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadTransactions();
  }, [isTestAccount]);

  const showIllustrativeBadge = isTestAccount && !hasRealData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Row (Page 11) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Transactions
        </h1>
        {showIllustrativeBadge && (
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
            Illustrative data
          </span>
        )}
      </div>

      {/* Table Card (Page 11) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">Source</th>
                <th className="pb-4 font-normal">Reference</th>
                <th className="pb-4 font-normal">Amount</th>
                <th className="pb-4 font-normal">Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                    No transactions ingested yet for this account.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 text-slate-700 font-medium">{tx.source}</td>
                    <td className="py-4 font-mono font-bold text-slate-900">{tx.reference}</td>
                    <td className="py-4 font-bold text-slate-900 font-sans">KSh {tx.amount}</td>
                    <td className="py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          tx.matchStatus === 'matched'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.matchStatus === 'pending' || tx.matchStatus === 'partial'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tx.match}
                      </span>
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
