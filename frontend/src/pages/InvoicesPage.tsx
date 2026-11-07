import React, { useState } from 'react';
import { FileText, Plus, Download, Eye, CheckCircle2, Clock } from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const [invoices] = useState([
    {
      id: 'inv-1',
      number: 'INV-2026-0001',
      customer: 'Acme Kenya Ltd',
      issueDate: '2026-11-01',
      dueDate: '2026-11-15',
      subtotal: '50,000.00',
      vat: '8,000.00',
      total: '58,000.00',
      status: 'ISSUED_INTERNAL',
      etimsStatus: 'MANUAL_RECORDED'
    },
    {
      id: 'inv-2',
      number: 'INV-2026-0002',
      customer: 'Kilifi Wholesale Enterprises',
      issueDate: '2026-11-03',
      dueDate: '2026-11-17',
      subtotal: '120,000.00',
      vat: '19,200.00',
      total: '139,200.00',
      status: 'ISSUED_INTERNAL',
      etimsStatus: 'NOT_SUBMITTED'
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Invoices & Credit Notes</h1>
          <p className="text-sm text-slate-400 mt-1">
            Compliant Kenyan invoicing with 16% standard VAT breakdown, sequential numbering, and PDF rendering.
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4 mr-2" />
          <span>New Tax Invoice</span>
        </button>
      </div>

      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left font-mono">
            <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Invoice Number</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Subtotal</th>
                <th className="py-2.5 px-3">VAT (16%)</th>
                <th className="py-2.5 px-3">Total (KES)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">eTIMS Mode</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E48]/50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#11223A]/30 transition">
                  <td className="py-2.5 px-3 font-semibold text-white">{inv.number}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-200">{inv.customer}</td>
                  <td className="py-2.5 px-3 text-slate-400">{inv.dueDate}</td>
                  <td className="py-2.5 px-3 text-slate-300">KES {inv.subtotal}</td>
                  <td className="py-2.5 px-3 text-slate-400">KES {inv.vat}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">KES {inv.total}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                      {inv.etimsStatus === 'MANUAL_RECORDED' ? 'Manually Recorded' : 'Not Submitted'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-2">
                    <button title="View" className="p-1 text-slate-400 hover:text-white">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button title="Download PDF" className="p-1 text-slate-400 hover:text-emerald-400">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
