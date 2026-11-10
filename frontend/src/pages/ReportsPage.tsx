import React from 'react';
import { BarChart3, Download, FileSpreadsheet, Calendar } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Financial & Tax Reports
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Exportable double-entry trial balances, KRA VAT return schedules, and reconciliation velocity analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Trial Balance Report */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-100 text-[#16A6D9] w-fit">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-950">Trial Balance Report</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              General ledger trial balance displaying ending debit and credit balances per account code for the period.
            </p>
          </div>
          <button className="w-full py-3 px-4 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition flex items-center justify-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Download CSV Export</span>
          </button>
        </div>

        {/* VAT Return Schedule */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-100 text-[#16A6D9] w-fit">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-950">Kenyan VAT Schedule</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Itemized taxable standard rate (16%), zero-rated, and exempt turnover breakdown for KRA iTax filing.
            </p>
          </div>
          <button className="w-full py-3 px-4 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition flex items-center justify-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export VAT Schedule</span>
          </button>
        </div>

        {/* Reconciliation Audit Trail */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-100 text-[#16A6D9] w-fit">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-950">Reconciliation Audit Trail</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Audit log of all rule tiers, confidence rankings, manual resolutions, and exception overrides.
            </p>
          </div>
          <button className="w-full py-3 px-4 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition flex items-center justify-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Audit Trail</span>
          </button>
        </div>
      </div>
    </div>
  );
};
