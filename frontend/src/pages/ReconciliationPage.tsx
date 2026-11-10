import React, { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../services/api';

interface ExceptionItem {
  id: string;
  ref: string;
  amount: string;
  method: string;
  status: string;
  candidates: Array<{ invoiceNo: string; customer: string; amount: string }>;
}

export const ReconciliationPage: React.FC = () => {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([
    {
      id: 'ex-1',
      ref: 'SKT2C77PD3',
      amount: '8,000',
      method: 'M-PESA',
      status: 'OPEN',
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
      candidates: [
        { invoiceNo: 'INV-0039', customer: 'Customer E', amount: '15,000' },
        { invoiceNo: 'INV-0040', customer: 'Customer F', amount: '15,000' },
      ],
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('ex-1');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedItem = exceptions.find((e) => e.id === selectedId) || exceptions[0];

  const handleAllocate = (invoiceNo: string) => {
    setToastMessage(`Payment ${selectedItem.ref} allocated to ${invoiceNo}. Recorded in immutable audit log.`);
    setTimeout(() => setToastMessage(null), 4500);

    // Remove or resolve item
    const remaining = exceptions.filter((e) => e.id !== selectedItem.id);
    setExceptions(remaining);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
    }
  };

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
        <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
          Illustrative data
        </span>
      </div>

      {/* Two Column Split Master-Detail Layout (Page 9) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Needs review list (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Needs review · {exceptions.length}
          </h2>

          <div className="space-y-2">
            {exceptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                All exceptions resolved!
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
                Two invoices match this amount. Choose one.
              </div>

              {/* Candidate Matches */}
              <div className="space-y-3 font-mono text-sm">
                {selectedItem.candidates.map((cand) => (
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
                      onClick={() => handleAllocate(cand.invoiceNo)}
                      className="px-5 py-2 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-sans text-xs font-bold transition shadow-md"
                    >
                      Allocate
                    </button>
                  </div>
                ))}
              </div>

              {/* Audit Trail Guarantee Notice (Page 9) */}
              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
                Every manual allocation is recorded in the audit log with your name.
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 text-sm">
              No pending exceptions. All transactions matched.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
