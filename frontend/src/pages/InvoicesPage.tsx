import React, { useState } from 'react';
import { Plus, Download, X, CheckCircle2, FileCheck2 } from 'lucide-react';
import { apiRequest } from '../services/api';

interface InvoiceSummary {
  id: string;
  number: string;
  customer: string;
  subtotal: string;
  vat: string;
  total: string;
  status: string;
  etimsStatus: string;
}

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([
    {
      id: 'inv-45',
      number: 'INV-0045',
      customer: 'Customer A',
      subtotal: '10,000',
      vat: '1,600',
      total: '11,600',
      status: 'ISSUED_INTERNAL',
      etimsStatus: 'Pending submission',
    },
    {
      id: 'inv-44',
      number: 'INV-0044',
      customer: 'Customer B',
      subtotal: '25,000',
      vat: '4,000',
      total: '29,000',
      status: 'ISSUED_INTERNAL',
      etimsStatus: 'Under review',
    },
    {
      id: 'inv-43',
      number: 'INV-0043',
      customer: 'Customer C',
      subtotal: '6,896.55',
      vat: '1,103.45',
      total: '8,000',
      status: 'ISSUED_INTERNAL',
      etimsStatus: 'Recorded manually',
    },
    {
      id: 'inv-42',
      number: 'INV-0042',
      customer: 'Customer D',
      subtotal: '10,344.83',
      vat: '1,655.17',
      total: '12,000',
      status: 'DRAFT',
      etimsStatus: 'Draft',
    },
  ]);

  const [selectedId, setSelectedId] = useState<string>('inv-45');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Invoice form state
  const [customerName, setCustomerName] = useState('Safari Enterprises');
  const [amount, setAmount] = useState('50000');
  const [description, setDescription] = useState('Enterprise Cloud Migration');

  const selectedInvoice = invoices.find((i) => i.id === selectedId) || invoices[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleMarkAsReviewed = () => {
    const updated = invoices.map((inv) =>
      inv.id === selectedInvoice.id
        ? { ...inv, etimsStatus: 'Recorded manually' }
        : inv
    );
    setInvoices(updated);
    showToast(`Invoice ${selectedInvoice.number} marked as Recorded Manually in compliance audit log.`);
  };

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    const vat = (numAmount * 0.16).toFixed(2);
    const total = (numAmount + parseFloat(vat)).toFixed(2);

    const newInv: InvoiceSummary = {
      id: `inv-${Date.now()}`,
      number: `INV-00${invoices.length + 43}`,
      customer: customerName,
      subtotal: numAmount.toLocaleString(),
      vat: parseFloat(vat).toLocaleString(),
      total: parseFloat(total).toLocaleString(),
      status: 'DRAFT',
      etimsStatus: 'Draft',
    };

    setInvoices([newInv, ...invoices]);
    setSelectedId(newInv.id);
    setIsNewOpen(false);
    showToast(`Draft invoice ${newInv.number} created successfully.`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Row (Page 10) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Invoices
        </h1>

        <button
          onClick={() => setIsNewOpen(true)}
          className="px-6 py-3 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold text-sm transition shadow-md shadow-[#16A6D9]/20 flex items-center space-x-2"
        >
          <span>New invoice</span>
        </button>
      </div>

      {/* Blue eTIMS Notice Banner (Page 10) */}
      <div className="p-4 rounded-2xl bg-[#EBF7FD] border border-[#BAE3F7] text-[#0369A1] text-xs leading-relaxed flex items-center justify-between">
        <div>
          <span className="font-bold">eTIMS manual review mode is on.</span> An invoice shows as accepted only after a real response from an approved KRA integration.
        </div>
        <span className="px-2.5 py-1 rounded-full bg-white/70 text-[#0369A1] font-semibold text-[11px] shrink-0 ml-4">
          Illustrative data.
        </span>
      </div>

      {/* Master Detail Grid (Page 10) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Invoices Table (8 cols, White Card) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                  <th className="pb-4 font-normal">Invoice</th>
                  <th className="pb-4 font-normal">Customer</th>
                  <th className="pb-4 font-normal">Total</th>
                  <th className="pb-4 font-normal">eTIMS status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {invoices.map((inv) => {
                  const isSelected = inv.id === selectedInvoice.id;
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedId(inv.id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-slate-50/80 font-semibold' : 'hover:bg-slate-50/40'
                      }`}
                    >
                      <td className="py-4 font-mono font-bold text-slate-900">{inv.number}</td>
                      <td className="py-4 text-slate-700">{inv.customer}</td>
                      <td className="py-4 font-bold text-slate-900 font-sans">KSh {inv.total}</td>
                      <td className="py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            inv.etimsStatus === 'Pending submission'
                              ? 'bg-indigo-100 text-indigo-800'
                              : inv.etimsStatus === 'Under review'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.etimsStatus === 'Recorded manually'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.etimsStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Invoice Inspector Card (4 cols, Dark Navy Card from Page 10) */}
        <div className="lg:col-span-4 bg-[#080D18] text-white rounded-3xl p-8 shadow-md space-y-6">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            {selectedInvoice.number}
          </div>

          <div className="text-4xl font-extrabold text-[#16A6D9] tracking-tight font-sans">
            KSh {selectedInvoice.total}
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800/80 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal</span>
              <span className="font-mono text-white">KSh {selectedInvoice.subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>VAT 16%</span>
              <span className="font-mono text-white">KSh {selectedInvoice.vat}</span>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={handleMarkAsReviewed}
              className="w-full py-3.5 px-4 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold text-sm transition shadow-lg shadow-[#16A6D9]/15"
            >
              Mark as reviewed
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: New Invoice */}
      {isNewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-950">
                Create Tax Invoice
              </h3>
              <button
                onClick={() => setIsNewOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Customer / Entity Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Acme Kenya Ltd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cloud Infrastructure & Audit"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Subtotal Amount (KES, excl. 16% VAT) *
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold transition"
                >
                  Save Invoice Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
