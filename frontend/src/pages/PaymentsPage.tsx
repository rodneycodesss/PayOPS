import React, { useState, useEffect } from 'react';
import { Plus, Send, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'All' | 'M-PESA' | 'Bank' | 'Pending' | 'Failed'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // STK Push Request state
  const [phone, setPhone] = useState('254712345678');
  const [amount, setAmount] = useState('1500.00');
  const [reference, setReference] = useState('INV-0045');
  const [description, setDescription] = useState('Consulting Services Settlement');

  // Baseline items matching Page 8 design exactly
  const [payments, setPayments] = useState<PaymentItem[]>([
    {
      id: 'p-1',
      reference: 'SKT4X92LQ1',
      customer: 'Customer A',
      method: 'M-PESA',
      amount: '12,000',
      status: 'Succeeded',
    },
    {
      id: 'p-2',
      reference: 'SKT7B41MZ8',
      customer: 'Customer B',
      method: 'M-PESA',
      amount: '5,500',
      status: 'Succeeded',
    },
    {
      id: 'p-3',
      reference: 'BNK-20931',
      customer: 'Customer C',
      method: 'Bank',
      amount: '48,000',
      status: 'Pending',
    },
    {
      id: 'p-4',
      reference: 'SKT9K10WA5',
      customer: 'Customer D',
      method: 'M-PESA',
      amount: '3,200',
      status: 'Failed',
    },
  ]);

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
          amount: amount,
          account_reference: reference,
          description: description,
        }),
      });

      // Add to table
      const newPay: PaymentItem = {
        id: res.id || String(Date.now()),
        reference: res.checkout_request_id ? res.checkout_request_id.substring(0, 10).toUpperCase() : 'SKT_NEW',
        customer: 'Self Service Checkout',
        method: 'M-PESA',
        amount: parseFloat(amount).toLocaleString(),
        status: 'Pending',
      };
      setPayments([newPay, ...payments]);
      setIsModalOpen(false);
      showToast(`STK Push prompt sent to ${phone} for KSh ${amount}`);
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

        <div>
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
            Illustrative data
          </span>
        </div>
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
              {filteredPayments.map((p) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Request Payment (STK Push) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-950">
                Request M-PESA Payment
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStkPush} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Customer Phone Number (254...) *
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
                  Amount (KES) *
                </label>
                <input
                  type="text"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1500.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Account Reference / Invoice Number *
                </label>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="INV-0045"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
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
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Prompting Handset...' : 'Send STK Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
