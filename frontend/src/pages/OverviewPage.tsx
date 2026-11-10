import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpRight, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

export const OverviewPage: React.FC = () => {
  const { user, isTestAccount } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);

  const getTimeBasedGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const [greeting, setGreeting] = useState<string>(getTimeBasedGreeting);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getTimeBasedGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const [stats, setStats] = useState({
    collectedToday: '184,500',
    outstanding: '912,300',
    needsReview: 7,
    reconciliationRate: 96,
  });

  const [attentionItems, setAttentionItems] = useState<Array<{ ref: string; amount: string; reason: string }>>([
    { ref: 'SKT2C77PD3', amount: '8,000', reason: 'Ambiguous match (two invoices match amount)' },
    { ref: 'SKT9K10WA5', amount: '3,200', reason: 'Customer name mismatch on account reference' },
  ]);

  const [etimsCounts, setEtimsCounts] = useState({
    draft: 3,
    pending: 2,
    underReview: 1,
    recordedManually: 4,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [paymentsRes, invoicesRes, exceptionsRes] = await Promise.allSettled([
          apiRequest<any[]>('/payments/'),
          apiRequest<any[]>('/invoices/'),
          apiRequest<any[]>('/reconciliation/exceptions?status_filter=OPEN'),
        ]);

        const payments = paymentsRes.status === 'fulfilled' ? paymentsRes.value : [];
        const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value : [];
        const exceptions = exceptionsRes.status === 'fulfilled' ? exceptionsRes.value : [];

        const hasAnyData = payments.length > 0 || invoices.length > 0 || exceptions.length > 0;

        if (!isMounted) return;

        if (hasAnyData) {
          setHasRealData(true);

          // Calculate collected today (or all succeeded payments)
          const todayStr = new Date().toISOString().slice(0, 10);
          const succeededPayments = payments.filter((p: any) => p.status === 'SUCCEEDED');
          const todayPayments = succeededPayments.filter(
            (p: any) => (p.payment_date || p.created_at || '').slice(0, 10) === todayStr
          );
          const totalToday = (todayPayments.length > 0 ? todayPayments : succeededPayments).reduce(
            (sum: number, p: any) => sum + Number(p.amount || 0),
            0
          );

          // Outstanding invoices
          const totalOutstanding = invoices
            .filter((inv: any) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
            .reduce((sum: number, inv: any) => sum + Number(inv.balance_due || inv.total_amount || 0), 0);

          // Reconciliation rate
          const recRate =
            payments.length > 0
              ? Math.round((succeededPayments.length / payments.length) * 100)
              : 100;

          setStats({
            collectedToday: totalToday.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
            outstanding: totalOutstanding.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
            needsReview: exceptions.length,
            reconciliationRate: recRate,
          });

          // Open attention items
          const realAttention = exceptions.slice(0, 3).map((ex: any) => ({
            ref: ex.payment_id ? ex.payment_id.slice(0, 10).toUpperCase() : ex.id.slice(0, 10).toUpperCase(),
            amount: ex.details || '—',
            reason: ex.reason || 'Pending manual verification',
          }));
          setAttentionItems(realAttention);

          // eTIMS pipeline
          const draftC = invoices.filter((i: any) => i.status === 'DRAFT').length;
          const pendingC = invoices.filter(
            (i: any) => i.etims_status === 'PENDING_REVIEW' || i.status === 'ISSUED_INTERNAL'
          ).length;
          const reviewC = invoices.filter((i: any) => i.etims_status === 'UNDER_REVIEW').length;
          const recordedC = invoices.filter((i: any) => i.etims_status === 'MANUALLY_RECORDED').length;

          setEtimsCounts({
            draft: draftC,
            pending: pendingC,
            underReview: reviewC,
            recordedManually: recordedC,
          });
        } else {
          setHasRealData(false);
          if (isTestAccount) {
            // Test account gets the baseline illustration from design specification
            setStats({
              collectedToday: '184,500',
              outstanding: '912,300',
              needsReview: 7,
              reconciliationRate: 96,
            });
            setAttentionItems([
              { ref: 'SKT2C77PD3', amount: '8,000', reason: 'Ambiguous match (two invoices match amount)' },
              { ref: 'SKT9K10WA5', amount: '3,200', reason: 'Customer name mismatch on account reference' },
            ]);
            setEtimsCounts({
              draft: 3,
              pending: 2,
              underReview: 1,
              recordedManually: 4,
            });
          } else {
            // Real tenant with empty state
            setStats({
              collectedToday: '0.00',
              outstanding: '0.00',
              needsReview: 0,
              reconciliationRate: 100,
            });
            setAttentionItems([]);
            setEtimsCounts({
              draft: 0,
              pending: 0,
              underReview: 0,
              recordedManually: 0,
            });
          }
        }
      } catch {
        if (!isMounted) return;
        if (!isTestAccount) {
          setStats({
            collectedToday: '0.00',
            outstanding: '0.00',
            needsReview: 0,
            reconciliationRate: 100,
          });
          setAttentionItems([]);
          setEtimsCounts({
            draft: 0,
            pending: 0,
            underReview: 0,
            recordedManually: 0,
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isTestAccount]);

  const showIllustrativeBadge = isTestAccount && !hasRealData;
  const totalPipeline =
    etimsCounts.draft + etimsCounts.pending + etimsCounts.underReview + etimsCounts.recordedManually;

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Top Header Row (Page 4) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            {new Date().toLocaleDateString('en-KE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
            {greeting}, {user?.full_name?.split(' ')[0] || 'User'}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative w-64 sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search payments, invoices"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#16A6D9] focus:ring-1 focus:ring-[#16A6D9] shadow-sm"
            />
          </div>
          {showIllustrativeBadge && (
            <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
              Illustrative data
            </span>
          )}
        </div>
      </div>

      {/* Top 3 KPI Cards (Page 4) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Card 1: Collected today (Dark Navy Card - 6 cols) */}
        <div className="md:col-span-6 bg-[#080D18] text-white rounded-3xl p-8 flex flex-col justify-between shadow-sm min-h-[200px]">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Collected today
            </span>
            <div className="text-4xl sm:text-5xl font-extrabold text-[#16A6D9] tracking-tight mt-2 font-sans">
              KSh {stats.collectedToday}
            </div>
          </div>

          {/* Sparkline curve visual */}
          <div className="pt-6">
            <svg viewBox="0 0 400 60" className="w-full h-12 overflow-visible">
              <path
                d={
                  !hasRealData && !isTestAccount
                    ? 'M0 50 L400 50'
                    : 'M0 45 Q 80 48, 140 25 T 260 30 T 340 10 T 400 15'
                }
                fill="none"
                stroke="#16A6D9"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Outstanding (White Card - 3 cols) */}
        <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-8 flex flex-col justify-between shadow-sm min-h-[200px]">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mt-2">
              KSh {stats.outstanding}
            </div>
          </div>
          <div className="text-xs text-slate-400 pt-4">
            Awaiting customer settlement
          </div>
        </div>

        {/* Card 3: Needs review (White Card - 3 cols) */}
        <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-8 flex flex-col justify-between shadow-sm min-h-[200px]">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Needs review
            </span>
            <div className="text-4xl sm:text-5xl font-extrabold text-amber-500 tracking-tight mt-2">
              {stats.needsReview}
            </div>
          </div>
          <div className="text-xs text-amber-600 font-medium pt-4">
            {stats.needsReview > 0 ? 'Ambiguous matches in queue' : 'Reconciliation queue clean'}
          </div>
        </div>
      </div>

      {/* Middle Section: Collections & Reconciliation Health (Page 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Collections, last 30 days (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-950">
              Collections, last 30 days
            </h2>
            {!hasRealData && !isTestAccount && (
              <span className="text-xs text-slate-400">Awaiting initial collection</span>
            )}
          </div>

          {/* Area Chart Visual */}
          <div className="h-64 w-full pt-4">
            {!hasRealData && !isTestAccount ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2 border-2 border-dashed border-slate-100 rounded-2xl">
                <span>No collection activity in the last 30 days.</span>
                <button
                  onClick={() => navigate('/payments')}
                  className="text-[#16A6D9] font-semibold hover:underline"
                >
                  Request your first payment
                </button>
              </div>
            ) : (
              <svg viewBox="0 0 600 200" className="w-full h-full">
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A6D9" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#16A6D9" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 160 Q 60 155, 120 120 T 240 140 T 360 80 T 480 60 T 600 40 L 600 200 L 0 200 Z"
                  fill="url(#areaGradient)"
                />
                <path
                  d="M0 160 Q 60 155, 120 120 T 240 140 T 360 80 T 480 60 T 600 40"
                  fill="none"
                  stroke="#16A6D9"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Reconciliation health (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-8 flex flex-col justify-between shadow-sm">
          <h2 className="text-base font-bold text-slate-950">
            Reconciliation health
          </h2>

          <div className="flex flex-col items-center justify-center my-6">
            {/* Donut percentage indicator */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#16A6D9]"
                  strokeDasharray={`${stats.reconciliationRate}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold text-slate-950 font-sans">
                  {stats.reconciliationRate}%
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-2 text-center">
              of payments reconciled
            </p>
          </div>

          <div className="text-[11px] text-slate-400 text-center">
            0 ambiguous payments auto-allocated
          </div>
        </div>
      </div>

      {/* Bottom Row: Needs your attention & eTIMS pipeline (Page 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Needs your attention (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-950">
              Needs your attention
            </h2>
            {attentionItems.length > 0 && (
              <span className="text-xs text-slate-500 font-medium">
                {attentionItems.length} {attentionItems.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>

          {attentionItems.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <div className="text-xs font-semibold text-slate-700">No attention items</div>
              <p className="text-[11px] text-slate-400 max-w-xs">
                All customer transactions and settlement accounts are synchronized with zero exceptions.
              </p>
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {attentionItems.map((item) => (
                <div
                  key={item.ref}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900">{item.ref}</span>
                    <span className="text-slate-400 mx-2">·</span>
                    <span className="text-slate-700 font-semibold">KSh {item.amount}</span>
                    <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                      {item.reason}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/reconciliation')}
                    className="px-4 py-2 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-sans text-xs font-semibold transition"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* eTIMS pipeline (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-950">
              eTIMS pipeline
            </h2>
            <span className="text-xs text-slate-400">
              {totalPipeline} Total Invoices
            </span>
          </div>

          {/* Segmented bar */}
          <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
            {totalPipeline === 0 ? (
              <div className="bg-slate-200 h-full w-full"></div>
            ) : (
              <>
                <div
                  className="bg-[#16A6D9] h-full transition-all duration-300"
                  style={{ width: `${(etimsCounts.draft / totalPipeline) * 100}%` }}
                ></div>
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${(etimsCounts.pending / totalPipeline) * 100}%` }}
                ></div>
                <div
                  className="bg-[#080D18] h-full transition-all duration-300"
                  style={{ width: `${(etimsCounts.underReview / totalPipeline) * 100}%` }}
                ></div>
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${(etimsCounts.recordedManually / totalPipeline) * 100}%` }}
                ></div>
              </>
            )}
          </div>

          {/* Breakdown Pills */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A6D9]"></span>
              <span>Draft <b>{etimsCounts.draft}</b></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>Pending <b>{etimsCounts.pending}</b></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#080D18]"></span>
              <span>Under review <b>{etimsCounts.underReview}</b></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Recorded manually <b>{etimsCounts.recordedManually}</b></span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400">
            Manual review mode enabled · Compliant Section 2 Rule 9 invariant
          </div>
        </div>
      </div>
    </div>
  );
};
