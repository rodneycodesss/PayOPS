import React, { useState, useEffect } from 'react';
import { Plus, Send, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface PaymentItem {
  id: string;
  reference: string;
  customer: string;
  method: string;
  amount: string;
  status: string;
}

export const PaymentsPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [activeTab, setActiveTab] = useState<'All' | 'M-PESA' | 'Bank' | 'Pending' | 'Failed'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // STK Push Request state
  const [phone, setPhone] = useState('254712345678');
  const [amount, setAmount] = useState('1500.00');
  const [reference, setReference] = useState('INV-0045');
  const [description, setDescription] = useState('Consulting Services Settlement');

  const [payments, setPayments] = useState<PaymentItem[]>([]);

  // Baseline illustrative items for test account when no data exists
  const illustrativePayments: PaymentItem[] = [
    {
      id: 'p-1',
      reference: 'SKT4X92LQ1',
      customer: 'Customer A',
      method: 'M-PESA',
      amount: '12,000.00',
      status: 'Succeeded',
    },
    {
      id: 'p-2',
      reference: 'SKT7B41MZ8',
      customer: 'Customer B',
      method: 'M-PESA',
      amount: '5,500.00',
      status: 'Succeeded',
    },
    {
      id: 'p-3',
      reference: 'BNK-20931',
      customer: 'Customer C',
      method: 'Bank',
      amount: '48,000.00',
      status: 'Pending',
    },
    {
      id: 'p-4',
      reference: 'SKT9K10WA5',
      customer: 'Customer D',
      method: 'M-PESA',
      amount: '3,200.00',
      status: 'Failed',
    },
  ];

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const real = await apiRequest<any[]>('/payments/');
      if (real && real.length > 0) {
        setHasRealData(true);
        const mapped: PaymentItem[] = real.map((p) => ({
          id: p.id,
          reference: p.provider_reference || p.checkout_request_id || p.id.slice(0, 10).toUpperCase(),
          customer: p.sender_name || p.sender_phone || p.account_reference || 'Customer',
          method: p.provider === 'DARAJA' ? 'M-PESA' : p.provider === 'BANK' ? 'Bank' : p.provider || 'M-PESA',
          amount: Number(p.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          status: p.status === 'SUCCEEDED' ? 'Succeeded' : p.status === 'FAILED' ? 'Failed' : 'Pending',
        }));
        setPayments(mapped);
      } else {
        setHasRealData(false);
        if (isTestAccount) {
          setPayments(illustrativePayments);
        } else {
          setPayments([]);
        }
      }
    } catch {
      setHasRealData(false);
      if (isTestAccount) {
        setPayments(illustrativePayments);
      } else {
        setPayments([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [isTestAccount]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res: any = await apiRequest('/payments/stk-push', {
        method: 'POST',
        body: JSON.stringify({
          phone_number: phone,
          amount: parseFloat(amount),
          account_reference: reference,
          transaction_desc: description,
        }),
      });

      // Refetch payments from API
      await fetchPayments();
      setIsModalOpen(false);
      showToast(`STK Push prompt sent to ${phone} for KSh ${Number(amount).toLocaleString()}`);
    } catch (err: any) {
      alert(`Payment dispatch failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'M-PESA') return p.method === 'M-PESA';
    if (activeTab === 'Bank') return p.method === 'Bank';
    if (activeTab === 'Pending') return p.status === 'Pending';
    if (activeTab === 'Failed') return p.status === 'Failed';
    return true;
  });

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

      {/* Header Row (Page 8) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Payments
        </h1>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold text-sm transition shadow-md shadow-[#16A6D9]/20 flex items-center space-x-2"
        >
          <span>Request payment</span>
        </button>
      </div>

      {/* Filter Tabs & Badge Row (Page 8) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {(['All', 'M-PESA', 'Bank', 'Pending', 'Failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                activeTab === tab
                  ? 'bg-[#080D18] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {showIllustrativeBadge && (
          <div>
            <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
              Illustrative data
            </span>
          </div>
        )}
      </div>

      {/* Table Card (Page 8) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">Reference</th>
                <th className="pb-4 font-normal">Customer</th>
                <th className="pb-4 font-normal">Method</th>
                <th className="pb-4 font-normal">Amount</th>
                <th className="pb-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    {payments.length === 0 ? (
                      <div className="space-y-2">
                        <p>No payments recorded yet for your business account.</p>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="text-[#16A6D9] font-bold hover:underline"
                        >
                          Send your first STK Push prompt
                        </button>
                      </div>
                    ) : (
                      'No payments matching this filter.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 font-mono font-bold text-slate-900">{p.reference}</td>
                    <td className="py-4 text-slate-700 font-medium">{p.customer}</td>
                    <td className="py-4 text-slate-500 font-mono text-xs">{p.method}</td>
                    <td className="py-4 font-bold text-slate-900 font-sans">KSh {p.amount}</td>
                    <td className="py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          p.status === 'Succeeded'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'Pending'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Request Payment (STK Push) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-950">Request M-PESA STK Push</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStkPush} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Customer Safaricom Number (254...)
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="254712345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Amount in KES (KSh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1500.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Account Reference / Invoice No.
                </label>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="INV-0045"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Transaction Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Settlement of balance"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold transition flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <span>Dispatching...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send STK Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
