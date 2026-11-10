import React, { useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

interface ReportCard {
  title: string;
  description: string;
  type: 'Download PDF' | 'Download CSV';
}

export const ReportsPage: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reports: ReportCard[] = [
    {
      title: 'Daily collections',
      description: 'Payments received by day and method.',
      type: 'Download PDF',
    },
    {
      title: 'Reconciliation report',
      description: 'Matched, partial and unmatched items.',
      type: 'Download PDF',
    },
    {
      title: 'Aged receivables',
      description: 'Who owes what, and for how long.',
      type: 'Download CSV',
    },
    {
      title: 'VAT summary',
      description: 'Output VAT by period for your accountant.',
      type: 'Download CSV',
    },
    {
      title: 'Trial balance',
      description: 'All accounts at a chosen date.',
      type: 'Download PDF',
    },
  ];

  const handleDownload = (report: ReportCard) => {
    setToastMessage(`Exporting ${report.title} (${report.type.replace('Download ', '')})...`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header (Page 16) */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Reports
        </h1>
      </div>

      {/* 5 Report Cards Grid (Page 16) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {reports.map((r, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between space-y-6 hover:border-slate-300 transition min-h-[220px]"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-950">{r.title}</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {r.description}
              </p>
            </div>

            <button
              onClick={() => handleDownload(r)}
              className="w-full py-3 px-4 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition shadow-md"
            >
              {r.type}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
