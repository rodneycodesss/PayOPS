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

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name?: string;
  total_amount: string;
  status: string;
  etims_status: string;
  manual_recording_ref?: string;
  created_at: string;
}

export const EtimsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<TaxSubmission[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [subList, invList] = await Promise.all([
          apiRequest<TaxSubmission[]>('/tax/submissions').catch(() => []),
          apiRequest<Invoice[]>('/invoices/').catch(() => []),
        ]);
        setSubmissions(subList);
        setInvoices(invList);
      } catch (err: any) {
        setError(err.message || 'Failed to load eTIMS compliance data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const manuallyRecordedCount = invoices.filter(
    (i) => i.etims_status === 'MANUALLY_RECORDED'
  ).length;

  const pendingReviewCount = invoices.filter(
    (i) => i.status === 'ISSUED_INTERNAL' && i.etims_status === 'NOT_SUBMITTED'
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">eTIMS Compliance Center</h1>
        <p className="text-sm text-slate-400 mt-1">
          KRA electronic Tax Invoice Management System adapter status, audit logs, and manual recording verification.
        </p>
      </div>

      {/* Compliance Rule Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-xs text-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300">Section 2 Rule 9 Invariant:</span> No invoice is stamped as
          "Accepted by KRA" without an authentic cryptographic provider response. Release 1 operates in explicit Manual
          Review mode where finance staff record external KRA portal references. All such invoices are labeled
          "manually recorded" across all reports, exports, and PDF documents.
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
          <div className="text-slate-400 uppercase tracking-wider font-semibold">Active Tax Adapter</div>
          <div className="text-lg font-bold text-slate-100 mt-2 font-mono">ManualReviewTaxAdapter</div>
          <div className="text-emerald-400 mt-1 flex items-center space-x-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Compliant Decoupled Architecture</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
          <div className="text-slate-400 uppercase tracking-wider font-semibold">Manually Recorded</div>
          <div className="text-lg font-bold text-white mt-2 font-mono">
            {manuallyRecordedCount} Invoices
          </div>
          <div className="text-purple-300 mt-1">Verified with physical / portal references</div>
        </div>

        <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
          <div className="text-slate-400 uppercase tracking-wider font-semibold">Pending Tax Recording</div>
          <div className="text-lg font-bold text-amber-400 mt-2 font-mono">
            {pendingReviewCount} Invoices
          </div>
          <div className="text-slate-400 mt-1">Issued internally awaiting verification</div>
        </div>
      </div>

      {/* Historical Submissions & Logs Table */}
      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">eTIMS Submission & Audit History</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable ledger of all tax authority submissions and compliance recordings.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading tax records...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-400 text-xs flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <FileCheck2 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p>No tax submissions recorded yet. Record manual eTIMS references on issued invoices.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left font-mono">
              <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Submission ID</th>
                  <th className="py-2.5 px-3">Invoice ID</th>
                  <th className="py-2.5 px-3">Adapter / Provider</th>
                  <th className="py-2.5 px-3">Compliance Status</th>
                  <th className="py-2.5 px-3">Control / Ref Number</th>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2E48]/50">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#11223A]/30 transition">
                    <td className="py-2.5 px-3 text-slate-300 font-semibold">{sub.id.substring(0, 8)}...</td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans">{sub.invoice_id.substring(0, 8)}...</td>
                    <td className="py-2.5 px-3 text-slate-300">{sub.provider}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          sub.status === 'MANUALLY_RECORDED'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            : sub.status === 'ACCEPTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {sub.control_number || 'Internal Reference Stamped'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(sub.submitted_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
