import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Filter, Search } from 'lucide-react';
import { apiRequest } from '../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    let url = '/audit-logs?limit=50';
    if (filterAction) {
      url += `&action=${encodeURIComponent(filterAction)}`;
    }
    apiRequest<any[]>(url)
      .then((data) => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Immutable Audit Trail</h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete cryptographic audit log recording all user access, updates, and financial operations.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-lg bg-[#11223A] border border-[#1E2E48] text-slate-300 hover:text-white transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Filter by Action (e.g. AUTH_LOGIN, TENANT_PROFILE_UPDATED)..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
          />
        </div>

        <div className="overflow-x-auto text-xs font-mono">
          <table className="w-full text-left">
            <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor Email</th>
                <th className="py-2.5 px-3">Resource Type</th>
                <th className="py-2.5 px-3">Client IP</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E48]/50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    {loading ? 'Fetching audit records...' : 'No audit records match the current filter.'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#11223A]/30 transition">
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">{log.actor_email || 'System'}</td>
                    <td className="py-2.5 px-3 text-slate-400">{log.resource_type}</td>
                    <td className="py-2.5 px-3 text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2 py-0.5 rounded bg-[#11223A] text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-sans"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0B192C] border border-[#1E2E48] rounded-xl p-6 text-xs">
            <h2 className="text-base font-bold text-white mb-2">Audit Event Details</h2>
            <div className="font-mono text-emerald-400 mb-4">{selectedLog.action}</div>
            <pre className="p-4 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-slate-200 overflow-x-auto text-[11px]">
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
