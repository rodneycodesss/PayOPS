import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface AuditRow {
  id: string;
  when: string;
  who: string;
  action: string;
  record: string;
}

export const AuditLogsPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [hasRealData, setHasRealData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Exact illustrative entries from Page 20
  const illustrativeLogs: AuditRow[] = [
    {
      id: 'a-1',
      when: '10 Nov, 09:12',
      who: 'Finance Administrator',
      action: 'Allocated payment manually',
      record: 'SKT2C77PD3 to INV-0046',
    },
    {
      id: 'a-2',
      when: '10 Nov, 08:40',
      who: 'System',
      action: 'Reconciliation run completed',
      record: 'Run 218',
    },
    {
      id: 'a-3',
      when: '09 Nov, 17:05',
      who: 'Business Owner',
      action: 'Invited a team member',
      record: 'Auditor role',
    },
    {
      id: 'a-4',
      when: '09 Nov, 11:30',
      who: 'Accountant',
      action: 'Reversed journal entry',
      record: 'JE-0099',
    },
  ];

  useEffect(() => {
    async function loadAuditLogs() {
      setIsLoading(true);
      try {
        const real = await apiRequest<any[]>('/audit/logs');
        if (real && real.length > 0) {
          setHasRealData(true);
          const mapped: AuditRow[] = real.map((log) => ({
            id: log.id,
            when: new Date(log.created_at).toLocaleDateString('en-KE', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            who: log.user_email || log.action_by || 'System',
            action: log.action || 'Ledger event',
            record: log.entity_id || log.details || 'System record',
          }));
          setLogs(mapped);
        } else {
          setHasRealData(false);
          if (isTestAccount) {
            setLogs(illustrativeLogs);
          } else {
            setLogs([]);
          }
        }
      } catch {
        setHasRealData(false);
        if (isTestAccount) {
          setLogs(illustrativeLogs);
        } else {
          setLogs([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAuditLogs();
  }, [isTestAccount]);

  const showIllustrativeBadge = isTestAccount && !hasRealData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Row (Page 20) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Audit Logs
        </h1>
        {showIllustrativeBadge && (
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
            Illustrative data
          </span>
        )}
      </div>

      {/* Table Card (Page 20) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">When</th>
                <th className="pb-4 font-normal">Who</th>
                <th className="pb-4 font-normal">Action</th>
                <th className="pb-4 font-normal">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                    No immutable audit trail entries recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 text-slate-500 font-mono text-xs">{log.when}</td>
                    <td className="py-4 font-medium text-slate-900">{log.who}</td>
                    <td className="py-4 text-slate-700">{log.action}</td>
                    <td className="py-4 font-mono text-xs text-slate-900 font-bold">
                      {log.record}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Invariant Note (Page 20) */}
      <p className="text-xs text-slate-400">
        Audit records cannot be edited or deleted.
      </p>
    </div>
  );
};
