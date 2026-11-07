import React, { useState } from 'react';
import { CreditCard, Send, CheckCircle, Clock, AlertCircle, Phone, ArrowDownRight } from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('254712345678');
  const [amount, setAmount] = useState('1500.00');
  const [reference, setReference] = useState('INV-2026-001');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleStkPush = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setFeedback(`STK Push prompt sent to ${phoneNumber} for KES ${amount} [Account: ${reference}]. Status: INITIATED`);
    }, 1200);
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
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
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
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-mono">ACTIVE</span>
                </div>
                <div className="text-slate-400 font-mono">Shortcode: 174379 (Sandbox)</div>
                <div className="text-[11px] text-slate-500 mt-2">Status: Implemented, unverified against live provider</div>
              </div>

              <div className="p-4 rounded-lg bg-[#0E1E35] border border-[#1E2E48]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-white">Buy Goods / Till Intake</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">STANDBY</span>
                </div>
                <div className="text-slate-400 font-mono">Till: Configurable per tenant</div>
                <div className="text-[11px] text-slate-500 mt-2">Ready for tenant credentials</div>
              </div>
            </div>
          </div>

          {/* Payment Lifecycle Ledger Table */}
          <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
            <h2 className="text-base font-semibold text-white mb-2">Recent Inbound Payments</h2>
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
                  <tr className="hover:bg-[#11223A]/30 transition">
                    <td className="py-2.5 px-3 font-semibold text-white">QKH4928172</td>
                    <td className="py-2.5 px-3 text-slate-400">DARAJA_PAYBILL</td>
                    <td className="py-2.5 px-3 text-slate-300">254711***492</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">KES 5,500.00</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-sans text-[10px]">
                        SUCCEEDED
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#11223A]/30 transition">
                    <td className="py-2.5 px-3 font-semibold text-white">QKH4910281</td>
                    <td className="py-2.5 px-3 text-slate-400">DARAJA_STK</td>
                    <td className="py-2.5 px-3 text-slate-300">254722***019</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">KES 1,200.00</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-sans text-[10px]">
                        SUCCEEDED
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
