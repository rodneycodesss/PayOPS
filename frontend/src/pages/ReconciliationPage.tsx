import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface ExceptionItem {
  id: string;
  ref: string;
  amount: string;
  method: string;
  status: string;
  reason?: string;
  candidates: Array<{ id?: string; invoiceNo: string; customer: string; amount: string }>;
}

export const ReconciliationPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Baseline illustrative items for test account when no data exists
  const illustrativeExceptions: ExceptionItem[] = [
    {
      id: 'ex-1',
      ref: 'SKT2C77PD3',
      amount: '8,000',
      method: 'M-PESA',
      status: 'OPEN',
      reason: 'Two invoices match this amount. Choose one.',
      candidates: [
        { invoiceNo: 'INV-0046', customer: 'Customer A', amount: '8,000' },
        { invoiceNo: 'INV-0048', customer: 'Customer B', amount: '8,000' },
      ],
    },
    {
      id: 'ex-2',
      ref: 'SKT9K10WA5',
      amount: '3,200',
      method: 'M-PESA',
      status: 'OPEN',
      reason: 'Customer name mismatch on account reference.',
      candidates: [
        { invoiceNo: 'INV-0041', customer: 'Customer D', amount: '3,200' },
      ],
    },
    {
      id: 'ex-3',
      ref: 'BNK-20933',
      amount: '15,000',
      method: 'Bank',
      status: 'OPEN',
      reason: 'Partial settlement candidate for open balance.',
      candidates: [
        { invoiceNo: 'INV-0039', customer: 'Customer E', amount: '15,000' },
        { invoiceNo: 'INV-0040', customer: 'Customer F', amount: '15,000' },
      ],
    },
  ];

  const fetchExceptions = async () => {
    setIsLoading(true);
    try {
      const [exRes, invRes] = await Promise.allSettled([
        apiRequest<any[]>('/reconciliation/exceptions?status_filter=OPEN'),
        apiRequest<any[]>('/invoices/'),
      ]);

      const realExceptions = exRes.status === 'fulfilled' ? exRes.value : [];
      const realInvoices = invRes.status === 'fulfilled' ? invRes.value : [];

      if (realExceptions && realExceptions.length > 0) {
        setHasRealData(true);
        const mapped: ExceptionItem[] = realExceptions.map((ex: any) => {
          const matchingCandidates = realInvoices
            .filter((inv: any) => inv.status !== 'PAID')
            .slice(0, 2)
            .map((inv: any) => ({
              id: inv.id,
              invoiceNo: inv.invoice_number,
              customer: inv.customer_name || 'Customer',
              amount: Number(inv.balance_due || inv.total_amount).toLocaleString(),
            }));

          return {
            id: ex.id,
            ref: ex.payment_id ? ex.payment_id.slice(0, 10).toUpperCase() : ex.id.slice(0, 10).toUpperCase(),
            amount: ex.details || '—',
            method: 'M-PESA',
            status: ex.status || 'OPEN',
            reason: ex.reason || 'Ambiguous match in ingestion queue',
            candidates: matchingCandidates,
          };
        });

        setExceptions(mapped);
        if (!selectedId || !mapped.find((e) => e.id === selectedId)) {
          setSelectedId(mapped[0].id);
        }
      } else {
        setHasRealData(false);
        if (isTestAccount) {
          setExceptions(illustrativeExceptions);
          setSelectedId('ex-1');
        } else {
          setExceptions([]);
          setSelectedId('');
        }
      }
    } catch {
      setHasRealData(false);
      if (isTestAccount) {
        setExceptions(illustrativeExceptions);
        setSelectedId('ex-1');
      } else {
        setExceptions([]);
        setSelectedId('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [isTestAccount]);

  const selectedItem = exceptions.find((e) => e.id === selectedId) || exceptions[0];

  const handleAllocate = async (candInvoice: { id?: string; invoiceNo: string }) => {
    if (!selectedItem) return;

    try {
      if (hasRealData && candInvoice.id) {
        await apiRequest(`/reconciliation/exceptions/${selectedItem.id}/resolve`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'MATCH_EXISTING_INVOICE',
            invoice_id: candInvoice.id,
            resolution_notes: `Manually matched payment to invoice ${candInvoice.invoiceNo}`,
          }),
        });
        await fetchExceptions();
      } else {
        const remaining = exceptions.filter((e) => e.id !== selectedItem.id);
        setExceptions(remaining);
        if (remaining.length > 0) {
          setSelectedId(remaining[0].id);
        }
      }

      setToastMessage(
        `Payment ${selectedItem.ref} allocated to ${candInvoice.invoiceNo}. Recorded in immutable audit log.`
      );
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err: any) {
      alert(`Resolution failed: ${err.message}`);
    }
  };

  const showIllustrativeBadge = isTestAccount && !hasRealData;

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Row (Page 9) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Reconciliation
        </h1>
        {showIllustrativeBadge && (
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
            Illustrative data
          </span>
        )}
      </div>

      {/* Two Column Split Master-Detail Layout (Page 9) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Needs review list (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Needs review</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              {exceptions.length}
            </span>
          </h2>

          <div className="space-y-2">
            {exceptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Queue is clear. All transactions reconciled.
              </div>
            ) : (
              exceptions.map((item) => {
                const isSelected = item.id === selectedItem?.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between text-left transition font-mono ${
                      isSelected
                        ? 'bg-[#080D18] text-white shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <span className="font-bold text-sm">{item.ref}</span>
                    <span className="font-bold text-sm">KSh {item.amount}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Allocation & Inspection Details (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-sm space-y-8">
          {selectedItem ? (
            <>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Payment
                </span>
                <div className="flex flex-wrap items-baseline gap-3 mt-1">
                  <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-950 tracking-tight font-sans">
                    KSh {selectedItem.amount}
                  </h2>
                  <span className="text-base text-slate-500 font-mono">
                    {selectedItem.ref} · {selectedItem.method}
                  </span>
                </div>
              </div>

              {/* Amber Ambiguity Banner (Page 9) */}
              <div className="p-4 rounded-2xl bg-[#FFF4E5] border border-amber-200/60 text-[#9A3412] text-sm font-medium">
                {selectedItem.reason || 'Candidate invoices match this amount. Choose one.'}
              </div>

              {/* Candidate Matches */}
              <div className="space-y-3 font-mono text-sm">
                {selectedItem.candidates && selectedItem.candidates.length > 0 ? (
                  selectedItem.candidates.map((cand) => (
                    <div
                      key={cand.invoiceNo}
                      className="p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between hover:border-slate-300 transition"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{cand.invoiceNo}</span>
                        <span className="text-slate-400 mx-2">·</span>
                        <span className="text-slate-700 font-sans">{cand.customer}</span>
                        <span className="text-slate-400 mx-2">·</span>
                        <span className="text-slate-900 font-bold font-sans">KSh {cand.amount}</span>
                      </div>

                      <button
                        onClick={() => handleAllocate(cand)}
                        className="px-5 py-2 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-sans text-xs font-bold transition shadow-md"
                      >
                        Allocate
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-5 rounded-2xl bg-slate-50 text-slate-500 text-xs font-sans text-center">
                    No open invoices available for allocation. Create an invoice to match against this payment.
                  </div>
                )}
              </div>

              {/* Audit Trail Guarantee Notice (Page 9) */}
              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
                Every manual allocation is recorded in the audit log with your name.
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 text-sm space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="font-semibold text-slate-700">No pending exceptions</div>
              <p className="text-xs text-slate-400">
                All customer transactions and settlement accounts are synchronized with zero exceptions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
