import React from 'react';
import { useAuth } from '../features/auth/AuthContext';

interface WorkflowRow {
  code: string;
  name: string;
  lastRun: string;
  status: string;
  statusType: 'active' | 'paused' | 'retried';
}

export const AutomationsPage: React.FC = () => {
  const { isTestAccount } = useAuth();

  // Exactly matching Page 17
  const workflows: WorkflowRow[] = [
    {
      code: 'WF03',
      name: 'Process payment callbacks',
      lastRun: '2 min ago',
      status: 'Active',
      statusType: 'active',
    },
    {
      code: 'WF04',
      name: 'Reconcile new payments',
      lastRun: '12 min ago',
      status: 'Active',
      statusType: 'active',
    },
    {
      code: 'WF07',
      name: 'Daily bank reconciliation',
      lastRun: 'Today, 06:00',
      status: 'Active',
      statusType: 'active',
    },
    {
      code: 'WF11',
      name: 'Payment reminders',
      lastRun: 'Yesterday',
      status: 'Paused',
      statusType: 'paused',
    },
    {
      code: 'WF12',
      name: 'Daily financial report',
      lastRun: 'Today, 07:00',
      status: 'Failed once, retried',
      statusType: 'retried',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Row (Page 17) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Automations
        </h1>
        {isTestAccount && (
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
            Illustrative data
          </span>
        )}
      </div>

      {/* Table Card (Page 17) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">Workflow</th>
                <th className="pb-4 font-normal">What it does</th>
                <th className="pb-4 font-normal">Last run</th>
                <th className="pb-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {workflows.map((wf) => (
                <tr key={wf.code} className="hover:bg-slate-50/60 transition">
                  <td className="py-4 font-mono font-bold text-slate-900">{wf.code}</td>
                  <td className="py-4 text-slate-700">{wf.name}</td>
                  <td className="py-4 text-slate-600 text-xs">{wf.lastRun}</td>
                  <td className="py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        wf.statusType === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : wf.statusType === 'paused'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {wf.status}
                    </span>
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
