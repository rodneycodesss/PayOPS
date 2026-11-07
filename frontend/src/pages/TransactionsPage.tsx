import React, { useState } from 'react';
import { History } from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const [events] = useState([
    {
      id: 'wh-1',
      provider: 'DARAJA',
      event: 'C2B_CONFIRMATION',
      reference: 'QKH9821034',
      sender: '254711***821',
      amount: '3,500.00',
      processed: true,
      time: '14:22:10 UTC'
    },
    {
      id: 'wh-2',
      provider: 'DARAJA',
      event: 'STK_CALLBACK',
      reference: 'ws_CO_07112026_981',
      sender: '254722***410',
      amount: '1,200.00',
      processed: true,
      time: '14:18:02 UTC'
    },
    {
      id: 'wh-3',
      provider: 'KCB_FEED',
      event: 'BANK_CREDIT_ALERT',
      reference: 'FT263110948',
      sender: 'ACME KENYA LTD',
      amount: '45,000.00',
      processed: true,
      time: '13:55:40 UTC'
    }
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Transactions & Inbound Webhooks</h1>
        <p className="text-sm text-slate-400 mt-1">
          Raw callback event store (`webhook_events`). Every inbound payload is persisted verbatim before processing.
        </p>
      </div>

      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <div className="overflow-x-auto text-xs font-mono">
          <table className="w-full text-left">
            <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Provider</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Sender / Source</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Processed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E48]/50">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-[#11223A]/30 transition">
                  <td className="py-2.5 px-3 text-slate-400">{e.time}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">{e.provider}</td>
                  <td className="py-2.5 px-3 text-slate-200">{e.event}</td>
                  <td className="py-2.5 px-3 text-white">{e.reference}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">{e.sender}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">KES {e.amount}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                      Verified
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
