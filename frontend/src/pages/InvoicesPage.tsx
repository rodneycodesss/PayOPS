import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  X,
  CreditCard,
  Send,
  Building,
} from 'lucide-react';
import { apiRequest } from '../services/api';

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: string | number;
  unit_price: string | number;
  tax_rate: string | number;
  tax_amount?: string;
  total_amount?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  issue_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  paid_amount: string;
  balance_due: string;
  currency: string;
  status: string;
  etims_status: string;
  etims_control_number?: string;
  manual_recording_ref?: string;
  created_at: string;
  items: InvoiceItem[];
}

interface Customer {
  id: string;
  name: string;
  kra_pin?: string;
}

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceForEtims, setSelectedInvoiceForEtims] = useState<Invoice | null>(null);
  const [selectedInvoiceForCreditNote, setSelectedInvoiceForCreditNote] = useState<Invoice | null>(null);

  // New Invoice Form State
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newIssueDate, setNewIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [newNotes, setNewNotes] = useState('');
  const [newItems, setNewItems] = useState<
    Array<{ description: string; quantity: number; unit_price: number; tax_rate: number }>
  >([{ description: 'Professional Services / Cloud Migration', quantity: 1, unit_price: 50000, tax_rate: 16 }]);

  // eTIMS Manual Recording Form State
  const [etimsRef, setEtimsRef] = useState('');
  const [etimsNotes, setEtimsNotes] = useState('');

  // Credit Note Form State
  const [creditNoteAmount, setCreditNoteAmount] = useState('');
  const [creditNoteReason, setCreditNoteReason] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invData, custList] = await Promise.all([
        apiRequest<Invoice[]>('/invoices/'),
        apiRequest<Customer[]>('/customers/').catch(() => []),
      ]);
      setInvoices(invData);
      setCustomers(custList);
      if (custList.length > 0 && !newCustomerId) {
        setNewCustomerId(custList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId) {
      alert('Please select or create a customer first.');
      return;
    }

    try {
      await apiRequest('/invoices/', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: newCustomerId,
          issue_date: newIssueDate,
          due_date: newDueDate,
          notes: newNotes || undefined,
          items: newItems.map((it) => ({
            description: it.description,
            quantity: it.quantity.toString(),
            unit_price: it.unit_price.toString(),
            tax_rate: it.tax_rate.toString(),
          })),
        }),
      });
      setIsCreateOpen(false);
      showToast('Invoice draft created successfully');
      await loadData();
    } catch (err: any) {
      alert(`Error creating invoice: ${err.message}`);
    }
  };

  const handleIssueInvoice = async (invoiceId: string) => {
    try {
      await apiRequest(`/invoices/${invoiceId}/issue`, { method: 'POST' });
      showToast('Invoice finalized & automatically posted to General Ledger');
      await loadData();
    } catch (err: any) {
      alert(`Issue failed: ${err.message}`);
    }
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/invoices/${invoice.id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('PDF download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Failed to download PDF: ${err.message}`);
    }
  };

  const handleManualEtimsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForEtims) return;
    try {
      await apiRequest(`/invoices/${selectedInvoiceForEtims.id}/etims/manual-record`, {
        method: 'POST',
        body: JSON.stringify({
          manual_recording_ref: etimsRef,
          manual_notes: etimsNotes,
        }),
      });
      setSelectedInvoiceForEtims(null);
      setEtimsRef('');
      setEtimsNotes('');
      showToast('Invoice stamped as MANUALLY_RECORDED with auditor notes');
      await loadData();
    } catch (err: any) {
      alert(`eTIMS recording failed: ${err.message}`);
    }
  };

  const handleCreditNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForCreditNote) return;
    try {
      await apiRequest(`/invoices/${selectedInvoiceForCreditNote.id}/credit-notes`, {
        method: 'POST',
        body: JSON.stringify({
          amount: creditNoteAmount,
          reason: creditNoteReason,
        }),
      });
      setSelectedInvoiceForCreditNote(null);
      setCreditNoteAmount('');
      setCreditNoteReason('');
      showToast('Credit note issued and invoice balance reduced');
      await loadData();
    } catch (err: any) {
      alert(`Credit note failed: ${err.message}`);
    }
  };

  // Computations for new draft invoice
  const draftSubtotal = newItems.reduce((acc, it) => acc + it.quantity * it.unit_price, 0);
  const draftTax = newItems.reduce((acc, it) => acc + (it.quantity * it.unit_price * it.tax_rate) / 100, 0);
  const draftTotal = draftSubtotal + draftTax;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Invoices & Credit Notes</h1>
          <p className="text-sm text-slate-400 mt-1">
            Kenyan tax invoicing with automatic 16% VAT computation, double-entry ledger posting, and ReportLab PDF rendering.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span>New Tax Invoice</span>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading invoice records...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-400 text-xs flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p>No invoices created yet. Click "New Tax Invoice" above to generate your first draft.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left font-mono">
              <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-right">VAT (16%)</th>
                  <th className="py-2.5 px-3 text-right">Total (KES)</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">eTIMS Mode</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2E48]/50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#11223A]/30 transition">
                    <td className="py-2.5 px-3 font-semibold text-white">{inv.invoice_number}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-200">
                      {inv.customer_name || 'Customer'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{inv.due_date}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      KES {parseFloat(inv.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      KES {parseFloat(inv.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                      KES {parseFloat(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-300 font-bold">
                      KES {parseFloat(inv.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          inv.status === 'ISSUED_INTERNAL'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : inv.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          inv.etims_status === 'MANUALLY_RECORDED'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            : inv.etims_status === 'ACCEPTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {inv.etims_status === 'MANUALLY_RECORDED'
                          ? 'Manual Recorded'
                          : inv.etims_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                      {/* Issue Action for DRAFT */}
                      {inv.status === 'DRAFT' && (
                        <button
                          onClick={() => handleIssueInvoice(inv.id)}
                          className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-sans transition inline-flex items-center"
                          title="Finalize invoice & post to General Ledger"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          <span>Issue</span>
                        </button>
                      )}

                      {/* Download PDF Action */}
                      <button
                        onClick={() => handleDownloadPdf(inv)}
                        title="Download Branded PDF"
                        className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* eTIMS Manual Record Action */}
                      {inv.status !== 'DRAFT' && inv.etims_status !== 'ACCEPTED' && (
                        <button
                          onClick={() => {
                            setSelectedInvoiceForEtims(inv);
                            setEtimsRef(inv.manual_recording_ref || '');
                          }}
                          title="Record eTIMS Filing Details"
                          className="p-1 rounded text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Credit Note Action */}
                      {inv.status !== 'DRAFT' && parseFloat(inv.balance_due) > 0 && (
                        <button
                          onClick={() => setSelectedInvoiceForCreditNote(inv)}
                          title="Issue Credit Note"
                          className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Create New Tax Invoice */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0B192C] border border-[#1E2E48] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-[#1E2E48] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Create New Tax Invoice</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  16% standard VAT breakdown calculated on submission.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-slate-400 mb-1">Customer</label>
                  {customers.length > 0 ? (
                    <select
                      value={newCustomerId}
                      onChange={(e) => setNewCustomerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.kra_pin ? `(${c.kra_pin})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-amber-400 text-[11px] py-2">
                      No customers yet. Please add a customer in the Customers page first.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={newIssueDate}
                    onChange={(e) => setNewIssueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-slate-400 font-semibold mb-2">Invoice Line Items</label>
                <div className="space-y-2">
                  {newItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-[#0E1E35] p-2.5 rounded-lg border border-[#1E2E48]">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Item Description"
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...newItems];
                            updated[idx].description = e.target.value;
                            setNewItems(updated);
                          }}
                          required
                          className="w-full px-2.5 py-1.5 rounded bg-[#11223A] border border-[#1E2E48] text-white text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...newItems];
                            updated[idx].quantity = parseFloat(e.target.value) || 0;
                            setNewItems(updated);
                          }}
                          required
                          className="w-full px-2.5 py-1.5 rounded bg-[#11223A] border border-[#1E2E48] text-white text-xs font-mono text-right"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Unit Price"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => {
                            const updated = [...newItems];
                            updated[idx].unit_price = parseFloat(e.target.value) || 0;
                            setNewItems(updated);
                          }}
                          required
                          className="w-full px-2.5 py-1.5 rounded bg-[#11223A] border border-[#1E2E48] text-white text-xs font-mono text-right"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-[10px] text-slate-400 block">16% VAT</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          KES {((item.quantity * item.unit_price * 1.16)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Calculations */}
              <div className="p-3 bg-[#0E1E35] rounded-xl border border-[#1E2E48] flex justify-between items-center text-xs font-mono">
                <div>
                  <span className="text-slate-400">Subtotal: </span>
                  <span className="text-white font-bold">KES {draftSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400">VAT (16%): </span>
                  <span className="text-amber-400 font-bold">KES {draftTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400">Total Due: </span>
                  <span className="text-emerald-400 font-bold text-sm">KES {draftTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customers.length === 0}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition disabled:opacity-50"
                >
                  Save Draft Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record eTIMS Manual Filing Details */}
      {selectedInvoiceForEtims && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0B192C] border border-[#1E2E48] rounded-2xl shadow-2xl p-6 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2E48]">
              <div>
                <h3 className="text-base font-bold text-white">Record eTIMS Filing Reference</h3>
                <p className="text-slate-400 mt-0.5">
                  Invoice #{selectedInvoiceForEtims.invoice_number}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoiceForEtims(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300">
              <span className="font-semibold">Release 1 Compliance:</span> Invoices will be marked as{' '}
              <code className="text-white bg-black/30 px-1 py-0.5 rounded font-mono">MANUALLY_RECORDED</code>.
              No fake control numbers are generated.
            </div>

            <form onSubmit={handleManualEtimsSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-slate-400 mb-1">
                  Manual Voucher / KRA Filing Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. KRA-PHY-2026-0041 or Physical Receipt Book #12"
                  value={etimsRef}
                  onChange={(e) => setEtimsRef(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Auditor / Compliance Notes</label>
                <textarea
                  rows={3}
                  placeholder="Filing notes, physical batch stamp, or compliance officer verification..."
                  value={etimsNotes}
                  onChange={(e) => setEtimsNotes(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForEtims(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition"
                >
                  Confirm Manual Recording
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Issue Credit Note */}
      {selectedInvoiceForCreditNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E2E48] rounded-2xl shadow-2xl p-6 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2E48]">
              <div>
                <h3 className="text-base font-bold text-white">Issue Credit Note</h3>
                <p className="text-slate-400 mt-0.5">
                  Against Invoice #{selectedInvoiceForCreditNote.invoice_number} (Balance Due: KES{' '}
                  {selectedInvoiceForCreditNote.balance_due})
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoiceForCreditNote(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreditNoteSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-slate-400 mb-1">Credit Note Amount (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedInvoiceForCreditNote.total_amount}
                  placeholder={`Max KES ${selectedInvoiceForCreditNote.total_amount}`}
                  value={creditNoteAmount}
                  onChange={(e) => setCreditNoteAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reason for Credit Note</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Commercial volume discount, goods return, billing adjustment..."
                  value={creditNoteReason}
                  onChange={(e) => setCreditNoteReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForCreditNote(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition"
                >
                  Issue Credit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
