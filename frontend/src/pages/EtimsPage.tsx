import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  ShieldAlert,
  CheckCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Hash,
  Calendar,
  FileText,
  UserCheck,
} from 'lucide-react';
import { apiRequest } from '../services/api';

interface TaxSubmission {
  id: string;
  invoice_id: string;
  provider: string;
  status: string;
  control_number?: string;
  qr_code_url?: string;
  submitted_at: string;
}

export const EtimsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<TaxSubmission[]>([
    {
      id: 'sub-001',
      invoice_id: 'INV-0043',
      provider: 'ManualReviewTaxAdapter',
      status: 'MANUALLY_RECORDED',
      control_number: 'KRA-PHY-2026-0043',
      submitted_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'sub-002',
      invoice_id: 'INV-0041',
      provider: 'ManualReviewTaxAdapter',
      status: 'MANUALLY_RECORDED',
      control_number: 'INTERNAL-VOUCHER-089',
      submitted_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            eTIMS Compliance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            KRA electronic Tax Invoice Management System adapter status and audit log.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
          Illustrative data
        </span>
      </div>

      {/* Compliance Rule Banner */}
      <div className="p-5 rounded-3xl bg-[#EBF7FD] border border-[#BAE3F7] text-[#0369A1] text-xs leading-relaxed space-y-1">
        <div className="font-bold text-sm text-[#0284C7] flex items-center space-x-2">
          <span>Section 2 Rule 9 Invariant</span>
        </div>
        <p className="text-slate-700">
          No invoice is stamped as "Accepted by KRA" without an authentic cryptographic provider response. Release 1 operates in explicit Manual Review mode where finance staff record external KRA portal references. All such invoices are labeled "manually recorded" across all reports and PDF exports.
        </p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Active Tax Adapter
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            ManualReviewTaxAdapter
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            Ready for OSCU/VSCU plug-in
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Manually Recorded
          </div>
          <div className="text-3xl font-extrabold text-slate-950 mt-2 font-sans">
            4 Invoices
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Audit log attached to each reference
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Pending Review
          </div>
          <div className="text-3xl font-extrabold text-amber-500 mt-2 font-sans">
            3 Invoices
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Awaiting compliance verification
          </div>
        </div>
      </div>

      {/* Submissions Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-base font-bold text-slate-950 mb-4">
          eTIMS Submission & Audit History
        </h2>
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">Submission</th>
                <th className="pb-4 font-normal">Invoice</th>
                <th className="pb-4 font-normal">Provider Adapter</th>
                <th className="pb-4 font-normal">Compliance Status</th>
                <th className="pb-4 font-normal">Control / Ref Number</th>
                <th className="pb-4 font-normal">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-4 font-mono font-bold text-slate-900">{sub.id}</td>
                  <td className="py-4 font-mono text-slate-700">{sub.invoice_id}</td>
                  <td className="py-4 text-slate-600 text-xs font-mono">{sub.provider}</td>
                  <td className="py-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-4 font-mono text-slate-800 font-medium">
                    {sub.control_number}
                  </td>
                  <td className="py-4 text-xs text-slate-500 font-mono">
                    {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
