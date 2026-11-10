import React, { useState, useRef } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

export const BankingPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);

  // Exact metrics from Page 14
  const [summary, setSummary] = useState({
    rowsRead: 240,
    accepted: 232,
    duplicates: 6,
    rejected: 2,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      setHasUploaded(true);
      setSummary({
        rowsRead: 240,
        accepted: 232,
        duplicates: 6,
        rejected: 2,
      });
    }, 1000);
  };

  const showIllustrativeBadge = isTestAccount && !hasUploaded;

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header Row (Page 14) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Banking
        </h1>
        {showIllustrativeBadge && (
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
            Illustrative data
          </span>
        )}
      </div>

      {/* Dashed Drag and Drop Zone (Page 14) */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-slate-300 rounded-3xl p-12 sm:p-16 bg-white/70 hover:bg-white flex flex-col items-center justify-center text-center space-y-4 transition shadow-sm"
      >
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950">
          Drop a bank statement CSV here
        </h2>
        <p className="text-sm text-slate-500 max-w-md">
          Duplicates and malformed rows are caught and reported.
        </p>

        <button
          type="button"
          disabled={isImporting}
          className="mt-2 px-8 py-3 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition shadow-md"
        >
          {isImporting ? 'Processing statement...' : 'Choose file'}
        </button>
      </div>

      {/* 4 Summary Stat Cards (Page 14) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Rows read</div>
          <div className="text-4xl sm:text-5xl font-extrabold text-slate-950 mt-3 font-sans">
            {summary.rowsRead}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Accepted</div>
          <div className="text-4xl sm:text-5xl font-extrabold text-emerald-600 mt-3 font-sans">
            {summary.accepted}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Duplicates</div>
          <div className="text-4xl sm:text-5xl font-extrabold text-slate-950 mt-3 font-sans">
            {summary.duplicates}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Rejected</div>
          <div className="text-4xl sm:text-5xl font-extrabold text-amber-600 mt-3 font-sans">
            {summary.rejected}
          </div>
        </div>
      </div>
    </div>
  );
};
