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
import { useAuth } from '../features/auth/AuthContext';
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
  const { isTestAccount } = useAuth();
  const [submissions, setSubmissions] = useState<TaxSubmission[]>([]);
  const [manualCount, setManualCount] = useState(4);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);

  // Illustrative baseline for test account
  const illustrativeSubmissions: TaxSubmission[] = [
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
  ];

  useEffect(() => {
    async function loadTaxData() {
      setIsLoading(true);
      try {
        const [subRes, invRes] = await Promise.allSettled([
          apiRequest<any[]>('/tax/submissions'),
          apiRequest<any[]>('/invoices/'),
        ]);

        const realSubs = subRes.status === 'fulfilled' ? subRes.value : [];
        const realInvs = invRes.status === 'fulfilled' ? invRes.value : [];

        const manuallyRecordedInvs = realInvs.filter((i: any) => i.etims_status === 'MANUALLY_RECORDED');

        if (realSubs.length > 0 || manuallyRecordedInvs.length > 0) {
          setHasRealData(true);
          const mapped: TaxSubmission[] = [
            ...realSubs.map((s: any) => ({
              id: s.id,
              invoice_id: s.invoice_id,
              provider: s.provider,
              status: s.status,
              control_number: s.control_number,
              qr_code_url: s.qr_code_url,
              submitted_at: s.submitted_at,
            })),
            ...manuallyRecordedInvs.map((i: any) => ({
              id: `man-${i.id}`,
              invoice_id: i.invoice_number,
              provider: 'ManualReviewTaxAdapter',
              status: 'MANUALLY_RECORDED',
              control_number: i.manual_recording_ref || i.etims_control_number || 'MANUAL-REF',
              submitted_at: i.created_at,
            })),
          ];

          setSubmissions(mapped);
          setManualCount(manuallyRecordedInvs.length);
        } else {
          setHasRealData(false);
          if (isTestAccount) {
            setSubmissions(illustrativeSubmissions);
            setManualCount(4);
          } else {
            setSubmissions([]);
            setManualCount(0);
          }
        }
      } catch {
        setHasRealData(false);
        if (isTestAccount) {
          setSubmissions(illustrativeSubmissions);
          setManualCount(4);
        } else {
          setSubmissions([]);
          setManualCount(0);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadTaxData();
  }, [isTestAccount]);

  const showIllustrativeBadge = isTestAccount && !hasRealData;

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
        {showIllustrativeBadge && (
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
            Illustrative data
          </span>
        )}
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
            {manualCount} Invoices
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Audit log attached to each reference
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Direct KRA Accepted
          </div>
          <div className="text-3xl font-extrabold text-slate-400 mt-2 font-sans">
            0 Invoices
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Enforces zero fake control numbers
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-base font-bold text-slate-950 mb-4">
          Manual Recording Audit Log
        </h2>

        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">Invoice Reference</th>
                <th className="pb-4 font-normal">Adapter Mode</th>
                <th className="pb-4 font-normal">External Control / Ref No.</th>
                <th className="pb-4 font-normal">Timestamp</th>
                <th className="pb-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No invoices recorded in manual review mode yet.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 font-mono font-bold text-slate-900">{s.invoice_id}</td>
                    <td className="py-4 font-mono text-xs text-slate-600">{s.provider}</td>
                    <td className="py-4 font-mono text-xs text-slate-700">
                      {s.control_number || '—'}
                    </td>
                    <td className="py-4 text-slate-500 text-xs font-mono">
                      {new Date(s.submitted_at).toLocaleString('en-KE')}
                    </td>
                    <td className="py-4">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        {s.status}
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
  );
};
