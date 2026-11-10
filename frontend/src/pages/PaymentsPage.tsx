import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Phone,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../services/api';

interface Payment {
  id: string;
  provider: string;
  receipt_number?: string;
  sender_phone?: string;
  sender_name?: string;
  amount: string;
  currency: string;
  status: string;
  account_reference?: string;
  created_at: string;
}

export const PaymentsPage: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('254712345678');
  const [amount, setAmount] = useState('1500.00');
  const [reference, setReference] = useState('INV-2026-001');
  const [description, setDescription] = useState('Consulting Services Settlement');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Payment[]>('/payments/');
      setPayments(data);
    } catch {
      // fallback or keep existing
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res: any = await apiRequest('/payments/stk-push', {
        method: 'POST',
        body: JSON.stringify({
          phone_number: phoneNumber,
          amount: amount,
          account_reference: reference,
          description: description,
        }),
      });
      setFeedback(
        `STK Push initiated! CheckoutRequestID: ${res.checkout_request_id || res.id}. Customer handset prompted.`
      );
      loadPayments();
    } catch (err: any) {
      setFeedback(`STK Push failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Payments & Collections</h1>
        <p className="text-sm text-slate-400 mt-1">
          Initiate M-PESA STK Push requests, manage shortcode credentials, and inspect incoming settlement claims.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STK Push Initiation Card */}
        <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">M-PESA Express (STK Push)</h2>
              <p className="text-xs text-slate-400">Trigger prompt directly on customer handset</p>
            </div>
          </div>

          <form onSubmit={handleStkPush} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Customer Phone (254...)</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Amount (KES)</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Account Reference / Invoice No</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition flex items-center justify-center space-x-2 text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Dispatching STK Push...' : 'Send STK Push Request'}</span>
            </button>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs ${
                  feedback.includes('failed')
                    ? 'bg-red-950/60 border border-red-500/40 text-red-300'
                    : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                }`}
              >
                {feedback}
              </div>
            )}
          </form>
        </div>

        {/* Configured Payment Methods */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
            <h2 className="text-base font-semibold text-white mb-2">Configured Payment Integrations</h2>
            <p className="text-xs text-slate-400 mb-4">Multi-tenant payment channel endpoints</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-lg bg-[#0E1E35] border border-[#1E2E48]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-white">Safaricom Daraja Paybill</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-mono">
                    ACTIVE
                  </span>
                </div>
                <div className="text-slate-400 font-mono">Shortcode: 174379 (Sandbox)</div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Status: Implemented, unverified against live provider
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#0E1E35] border border-[#1E2E48]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-white">Buy Goods / Till Intake</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                    STANDBY
                  </span>
                </div>
                <div className="text-slate-400 font-mono">Till: Configurable per tenant</div>
                <div className="text-[11px] text-slate-500 mt-2">Ready for tenant credentials</div>
              </div>
            </div>
          </div>

          {/* Payment Lifecycle Ledger Table */}
          <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-white">Recent Inbound Payments</h2>
              <button
                onClick={loadPayments}
                className="p-1 text-slate-400 hover:text-white"
                title="Refresh Payments"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left font-mono">
                <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Receipt / Ref</th>
                    <th className="py-2.5 px-3">Provider</th>
                    <th className="py-2.5 px-3">Sender</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2E48]/50">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No payments recorded yet. Trigger an STK Push above or test with n8n.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#11223A]/30 transition">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {p.receipt_number || p.account_reference || p.id.substring(0, 10)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{p.provider}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {p.sender_phone || p.sender_name || 'Handset Customer'}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">
                          KES {parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-sans text-[10px] ${
                              p.status === 'SUCCEEDED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : p.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-slate-700/50 text-slate-300 border border-slate-600'
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
        </div>
      </div>
    </div>
  );
};
