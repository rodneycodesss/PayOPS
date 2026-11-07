import React from 'react';
import { FileCheck2, ShieldAlert, CheckCircle, Clock, ExternalLink } from 'lucide-react';

export const EtimsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">eTIMS Compliance Center</h1>
        <p className="text-sm text-slate-400 mt-1">
          KRA electronic Tax Invoice Management System adapter status and manual recording queue.
        </p>
      </div>

      {/* Compliance Rule Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-xs text-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300">Section 2 Rule 9 Invariant:</span> No invoice is stamped as
          "Accepted by KRA" without an authentic cryptographic provider response. Release 1 operates in explicit Manual
          Review mode where staff mark invoices with external KRA portal references. All such invoices are labeled
          "manually recorded" across all reports and PDF exports.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
          <div className="text-slate-400 uppercase tracking-wider font-semibold">Adapter Status</div>
          <div className="text-lg font-bold text-slate-100 mt-2 font-mono">ManualReviewAdapter</div>
          <div className="text-emerald-400 mt-1">Ready for OSCU/VSCU plug-in</div>
        </div>

        <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
          <div className="text-slate-400 uppercase tracking-wider font-semibold">Manually Recorded</div>
          <div className="text-lg font-bold text-white mt-2 font-mono">48 Invoices</div>
          <div className="text-slate-400 mt-1">Audit log attached to each reference</div>
        </div>

        <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
          <div className="text-slate-400 uppercase tracking-wider font-semibold">Pending Review</div>
          <div className="text-lg font-bold text-amber-400 mt-2 font-mono">3 Invoices</div>
          <div className="text-slate-400 mt-1">Awaiting finance officer verification</div>
        </div>
      </div>
    </div>
  );
};
