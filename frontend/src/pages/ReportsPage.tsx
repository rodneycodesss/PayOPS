import React from 'react';
import { BarChart3, Download, FileSpreadsheet, Calendar } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Financial & Tax Reports</h1>
        <p className="text-sm text-slate-400 mt-1">
          Exportable double-entry trial balances, KRA VAT return summaries, and intake channel velocity analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48] flex flex-col justify-between">
          <div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">Trial Balance Report</h2>
            <p className="text-xs text-slate-400 mt-1">
              General ledger trial balance displaying ending debit and credit balances per account code for the period.
            </p>
          </div>
          <button className="mt-4 w-full py-2 px-3 rounded-lg bg-[#11223A] hover:bg-emerald-500 hover:text-white border border-[#1E2E48] text-slate-200 text-xs font-medium transition flex items-center justify-center space-x-2">
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Export</span>
          </button>
        </div>

        <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48] flex flex-col justify-between">
          <div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 w-fit mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">Kenyan VAT Return Schedule</h2>
            <p className="text-xs text-slate-400 mt-1">
              Itemized taxable standard rate (16%), zero-rated, and exempt turnover breakdown for KRA iTax filing.
            </p>
          </div>
          <button className="mt-4 w-full py-2 px-3 rounded-lg bg-[#11223A] hover:bg-emerald-500 hover:text-white border border-[#1E2E48] text-slate-200 text-xs font-medium transition flex items-center justify-center space-x-2">
            <Download className="w-3.5 h-3.5" />
            <span>Export VAT Schedule</span>
          </button>
        </div>

        <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48] flex flex-col justify-between">
          <div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 w-fit mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">Reconciliation Audit Trail</h2>
            <p className="text-xs text-slate-400 mt-1">
              Audit log of all rule tiers, confidence rankings, manual resolutions, and exception overrides.
            </p>
          </div>
          <button className="mt-4 w-full py-2 px-3 rounded-lg bg-[#11223A] hover:bg-emerald-500 hover:text-white border border-[#1E2E48] text-slate-200 text-xs font-medium transition flex items-center justify-center space-x-2">
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Trail</span>
          </button>
        </div>
      </div>
    </div>
  );
};
