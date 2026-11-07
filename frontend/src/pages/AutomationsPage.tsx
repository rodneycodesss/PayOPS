import React from 'react';
import { Cpu, CheckCircle2, ShieldCheck, Play, ExternalLink } from 'lucide-react';

const WORKFLOWS = [
  { id: 'WF01', name: 'M-PESA Intake Polling', group: 'Payments', status: 'Active', schedule: 'Continuous' },
  { id: 'WF02', name: 'STK Push Initiation Trigger', group: 'Payments', status: 'Active', schedule: 'On Demand' },
  { id: 'WF03', name: 'STK Callback Webhook Processor', group: 'Payments', status: 'Active', schedule: 'Webhook' },
  { id: 'WF04', name: 'Invoice Auto-Reconciliation', group: 'Reconciliation', status: 'Active', schedule: 'Daily at 02:00' },
  { id: 'WF05', name: 'Unmatched Exceptions Alert', group: 'Reconciliation', status: 'Active', schedule: 'Daily at 06:00' },
  { id: 'WF06', name: 'Bank Statement Ingest Pipeline', group: 'Reconciliation', status: 'Active', schedule: 'Manual / Scheduled' },
  { id: 'WF07', name: 'Daily Bank Reconciliation', group: 'Reconciliation', status: 'Active', schedule: 'Daily at 23:00' },
  { id: 'WF08', name: 'eTIMS Submission Queue (Manual Mode)', group: 'Tax', status: 'Active', schedule: 'Batched' },
  { id: 'WF10', name: 'Customer Invoice Delivery (Email)', group: 'Customer Comms', status: 'Active', schedule: 'Instant on Issue' },
  { id: 'WF11', name: 'Payment Reminder Notifications', group: 'Customer Comms', status: 'Active', schedule: 'Weekly' },
  { id: 'WF12', name: 'Daily Executive Financial Report', group: 'Reporting', status: 'Active', schedule: 'Daily at 07:00' },
];

export const AutomationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">n8n Automation Workflows</h1>
          <p className="text-sm text-slate-400 mt-1">
            Cross-system orchestration engine executing scheduled triggers, alerts, and customer notifications.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-[#11223A] border border-[#1E2E48] text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1.5" />
          <span>Boundary: Zero Direct DB Access</span>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left font-mono">
            <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Workflow Name</th>
                <th className="py-2.5 px-3">Group</th>
                <th className="py-2.5 px-3">Cadence / Trigger</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E48]/50">
              {WORKFLOWS.map((wf) => (
                <tr key={wf.id} className="hover:bg-[#11223A]/30 transition">
                  <td className="py-2.5 px-3 font-semibold text-emerald-400">{wf.id}</td>
                  <td className="py-2.5 px-3 font-sans text-white font-medium">{wf.name}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-300">{wf.group}</td>
                  <td className="py-2.5 px-3 text-slate-400">{wf.schedule}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                      {wf.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button className="px-2.5 py-1 rounded bg-[#11223A] hover:bg-emerald-500 hover:text-white border border-[#1E2E48] text-slate-300 text-[11px] font-sans transition">
                      Trigger Run
                    </button>
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
