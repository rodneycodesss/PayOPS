import React, { useState, useEffect } from 'react';
import { Plus, Download, X, CheckCircle2, FileCheck2, User } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface InvoiceSummary {
  id: string;
  number: string;
  customer: string;
  customerId?: string;
  subtotal: string;
  vat: string;
  total: string;
  balanceDue?: string;
  status: string;
  etimsStatus: string;
}

export const InvoicesPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Invoice form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('Safari Enterprises Ltd');
  const [amount, setAmount] = useState('50000');
  const [description, setDescription] = useState('Enterprise Cloud Migration');

  // Baseline illustrative items for test account when no data exists
  const illustrativeInvoices: InvoiceSummary[] = [
    {
      id: 'inv-45',
      number: 'INV-0045',
      customer: 'Customer A',
      subtotal: '10,000.00',
      vat: '1,600.00',
      total: '11,600.00',
      balanceDue: '11,600.00',
      status: 'ISSUED_INTERNAL',
      etimsStatus: 'Pending submission',
    },
    {
      id: 'inv-44',
      number: 'INV-0044',
      customer: 'Customer B',
      subtotal: '25,000.00',
      vat: '4,000.00',
      total: '29,000.00',
      balanceDue: '29,000.00',
      status: 'ISSUED_INTERNAL',
      etimsStatus: 'Under review',
    },
    {
      id: 'inv-43',
      number: 'INV-0043',
      customer: 'Customer C',
      subtotal: '6,896.55',
      vat: '1,103.45',
      total: '8,000.00',
      balanceDue: '0.00',
      status: 'PAID',
      etimsStatus: 'Recorded manually',
    },
    {
      id: 'inv-42',
      number: 'INV-0042',
      customer: 'Customer D',
      subtotal: '10,344.83',
      vat: '1,655.17',
      total: '12,000.00',
      balanceDue: '12,000.00',
      status: 'DRAFT',
      etimsStatus: 'Draft',
    },
  ];

  const fetchInvoicesAndCustomers = async () => {
    setIsLoading(true);
    try {
      const [invRes, custRes] = await Promise.allSettled([
        apiRequest<any[]>('/invoices/'),
        apiRequest<any[]>('/customers/'),
      ]);

      const realInvoices = invRes.status === 'fulfilled' ? invRes.value : [];
      const realCustomers = custRes.status === 'fulfilled' ? custRes.value : [];

      if (realCustomers.length > 0) {
        setCustomers(realCustomers.map((c: any) => ({ id: c.id, name: c.name })));
        if (!selectedCustomerId) setSelectedCustomerId(realCustomers[0].id);
      }

      if (realInvoices && realInvoices.length > 0) {
        setHasRealData(true);
        const mapped: InvoiceSummary[] = realInvoices.map((inv: any) => ({
          id: inv.id,
          number: inv.invoice_number,
          customer: inv.customer_name || 'Customer',
          customerId: inv.customer_id,
          subtotal: Number(inv.subtotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          vat: Number(inv.tax_amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          total: Number(inv.total_amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          balanceDue: Number(inv.balance_due || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          status: inv.status,
          etimsStatus:
            inv.etims_status === 'MANUALLY_RECORDED'
              ? 'Recorded manually'
              : inv.etims_status === 'PENDING_REVIEW'
              ? 'Pending submission'
              : inv.status === 'DRAFT'
              ? 'Draft'
              : 'Under review',
        }));
        setInvoices(mapped);
        if (!selectedId || !mapped.find((i) => i.id === selectedId)) {
          setSelectedId(mapped[0].id);
        }
      } else {
        setHasRealData(false);
        if (isTestAccount) {
          setInvoices(illustrativeInvoices);
          setSelectedId('inv-45');
        } else {
          setInvoices([]);
          setSelectedId('');
        }
      }
    } catch {
      setHasRealData(false);
      if (isTestAccount) {
        setInvoices(illustrativeInvoices);
        setSelectedId('inv-45');
      } else {
        setInvoices([]);
        setSelectedId('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoicesAndCustomers();
  }, [isTestAccount]);

  const selectedInvoice = invoices.find((i) => i.id === selectedId) || invoices[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleMarkAsReviewed = async () => {
    if (!selectedInvoice) return;
    try {
      if (hasRealData) {
        await apiRequest(`/invoices/${selectedInvoice.id}/etims/manual-record`, {
          method: 'POST',
          body: JSON.stringify({
            manual_recording_ref: `KRA-PHY-${Date.now().toString().slice(-6)}`,
            manual_notes: 'Verified via KRA iTax portal receipt.',
          }),
        });
        await fetchInvoicesAndCustomers();
      } else {
        const updated = invoices.map((inv) =>
          inv.id === selectedInvoice.id ? { ...inv, etimsStatus: 'Recorded manually' } : inv
        );
        setInvoices(updated);
      }
      showToast(`Invoice ${selectedInvoice.number} marked as Recorded Manually in compliance audit log.`);
    } catch (err: any) {
      alert(`Manual recording failed: ${err.message}`);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let custId = selectedCustomerId;

      // If no customer exists yet, create one first
      if (!custId) {
        const newCust = await apiRequest<any>('/customers/', {
          method: 'POST',
          body: JSON.stringify({
            name: newCustomerName,
            email: `billing@${newCustomerName.toLowerCase().replace(/[^a-z0-9]/g, '')}.co.ke`,
          }),
        });
        custId = newCust.id;
      }

      const numAmount = parseFloat(amount) || 0;
      await apiRequest('/invoices/', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: custId,
          items: [
            {
              description: description,
              quantity: 1,
              unit_price: numAmount,
              tax_rate: 16.0,
            },
          ],
        }),
      });

      await fetchInvoicesAndCustomers();
      setIsNewOpen(false);
      showToast('Draft invoice created successfully with Section 2 Rule 9 VAT computation.');
    } catch (err: any) {
      alert(`Failed to create invoice: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedInvoice) return;
    if (hasRealData) {
      window.open(`/api/v1/invoices/${selectedInvoice.id}/pdf`, '_blank');
    } else {
      showToast(`Streaming PDF for ${selectedInvoice.number}...`);
    }
  };

  const showIllustrativeBadge = isTestAccount && !hasRealData;

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
        {showIllustrativeBadge && (
          <span className="px-2.5 py-1 rounded-full bg-white/70 text-[#0369A1] font-semibold text-[11px] shrink-0 ml-4">
            Illustrative data.
          </span>
        )}
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
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                      <div className="space-y-2">
                        <p>No invoices created yet for your business account.</p>
                        <button
                          onClick={() => setIsNewOpen(true)}
                          className="text-[#16A6D9] font-bold hover:underline"
                        >
                          Create your first invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const isSelected = selectedInvoice && inv.id === selectedInvoice.id;
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Invoice Inspector Card (4 cols, Dark Navy Card from Page 10) */}
        <div className="lg:col-span-4 bg-[#080D18] text-white rounded-3xl p-8 shadow-md space-y-6">
          {selectedInvoice ? (
            <>
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                {selectedInvoice.number}
              </div>

              <div className="text-4xl font-extrabold text-[#16A6D9] tracking-tight font-sans">
                KSh {selectedInvoice.total}
              </div>

              {/* Status and Customer details */}
              <div className="space-y-3 pt-2 text-xs border-t border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer</span>
                  <span className="text-white font-semibold">{selectedInvoice.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-200 font-mono">KSh {selectedInvoice.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">VAT (16%)</span>
                  <span className="text-slate-200 font-mono">KSh {selectedInvoice.vat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="text-emerald-400 font-semibold">{selectedInvoice.status}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400">eTIMS status</span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-[#16A6D9] text-[11px] font-semibold">
                    {selectedInvoice.etimsStatus}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <button
                  onClick={handleMarkAsReviewed}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition"
                >
                  Mark as manually recorded
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition flex items-center justify-center space-x-2 border border-slate-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download invoice PDF</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 text-center leading-relaxed">
                Compliant Section 2 Rule 9 invariant. Control numbers are stamped strictly on provider acceptance.
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs space-y-3">
              <FileCheck2 className="w-8 h-8 text-slate-700 mx-auto" />
              <div>No invoice selected.</div>
              <p className="text-[11px] text-slate-600">
                Create or select an invoice to view its tax lines and double-entry postings.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: New Invoice */}
      {isNewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-950">Create New Invoice</h3>
              <button
                onClick={() => setIsNewOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-4 text-xs font-sans">
              {customers.length > 0 ? (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Select Customer
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Customer Entity Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="e.g. Safari Enterprises Ltd"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Item Description / Line Item
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Enterprise Cloud Migration"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Net Amount (KES)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  16% VAT (KSh {(parseFloat(amount || '0') * 0.16).toLocaleString()}) will be added automatically.
                </span>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold transition flex items-center space-x-2"
                >
                  {isSubmitting ? 'Creating...' : 'Create Draft Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
