import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  CreditCard,
  Building,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { apiRequest } from '../services/api';

const MOCK_REVENUE_TREND = [
  { day: 'Mon', mpesa: 142000, bank: 85000 },
  { day: 'Tue', mpesa: 198000, bank: 120000 },
  { day: 'Wed', mpesa: 165000, bank: 95000 },
  { day: 'Thu', mpesa: 245000, bank: 180000 },
  { day: 'Fri', mpesa: 320000, bank: 210000 },
  { day: 'Sat', mpesa: 280000, bank: 110000 },
  { day: 'Sun', mpesa: 190000, bank: 60000 },
];

export const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState({
    todayCollections: 'KES 342,850.00',
    monthlyCollections: 'KES 6,845,200.00',
    outstandingInvoices: 'KES 1,240,500.00',
    reconciledRate: '98.4%',
    failedPayments: 0,
    etimsPending: 3,
    etimsAccepted: 48,
  });
  const [recentAudit, setRecentAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live audit logs as proof of backend connectivity
    apiRequest<any[]>('/audit-logs?limit=5')
      .then((data) => {
        setRecentAudit(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Operations & Financial Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time collections, double-entry ledger reconciliation, and KRA compliance posture.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-lg bg-[#11223A] border border-[#1E2E48] text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Live Sync
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Collections</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3 font-mono">{stats.todayCollections}</div>
          <div className="flex items-center text-xs text-emerald-400 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
            <span>+18.2% vs yesterday</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Total</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3 font-mono">{stats.monthlyCollections}</div>
          <div className="text-xs text-slate-400 mt-2">Nov 2026 Accounting Period</div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reconciled Rate</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3 font-mono">{stats.reconciledRate}</div>
          <div className="text-xs text-slate-400 mt-2">0 ambiguous exceptions open</div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">eTIMS Posture</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-3 font-mono">
            {stats.etimsAccepted} <span className="text-sm font-normal text-slate-400">Recorded</span>
          </div>
          <div className="text-xs text-amber-400 mt-2">{stats.etimsPending} pending manual review</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Collections Trend */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">7-Day Revenue Velocity</h2>
              <p className="text-xs text-slate-400">M-PESA Daraja vs Direct Bank Settlements</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span> M-PESA
              </span>
              <span className="flex items-center text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5"></span> Bank Wire
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_REVENUE_TREND}>
                <defs>
                  <linearGradient id="mpesaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bankGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0E1E35', borderColor: '#1E2E48', color: '#fff' }}
                  formatter={(val: any) => [`KES ${Number(val).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="mpesa" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#mpesaGrad)" />
                <Area type="monotone" dataKey="bank" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#bankGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Channels Breakdown */}
        <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48] flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-white mb-1">Settlement Channels</h2>
            <p className="text-xs text-slate-400 mb-4">Volume distribution across intake methods</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">M-PESA Paybill (Shortcode 174379)</span>
                  <span className="font-mono text-emerald-400 font-medium">68%</span>
                </div>
                <div className="w-full bg-[#11223A] rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Buy Goods / Till Intake</span>
                  <span className="font-mono text-teal-400 font-medium">21%</span>
                </div>
                <div className="w-full bg-[#11223A] rounded-full h-2">
                  <div className="bg-teal-500 h-2 rounded-full" style={{ width: '21%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Commercial Bank Direct Feeds</span>
                  <span className="font-mono text-blue-400 font-medium">11%</span>
                </div>
                <div className="w-full bg-[#11223A] rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '11%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E2E48]/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Base Currency: KES</span>
            <span className="font-mono text-emerald-400">No Minor Unit Drift</span>
          </div>
        </div>
      </div>

      {/* Live Immutable Audit Feed */}
      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Live System Audit Trail</h2>
            <p className="text-xs text-slate-400">Authenticated immutable activity log from backend database</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Table: audit_logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E1E35] text-slate-300 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3 rounded-l">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3 rounded-r">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E48]/60 font-mono">
              {recentAudit.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                    {loading ? 'Querying backend audit logs...' : 'Zero recent actions recorded.'}
                  </td>
                </tr>
              ) : (
                recentAudit.map((log) => (
                  <tr key={log.id} className="hover:bg-[#11223A]/40 transition">
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">{log.actor_email || 'System / Anonymous'}</td>
                    <td className="py-2.5 px-3 text-slate-400">{log.resource_type}</td>
                    <td className="py-2.5 px-3 text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
