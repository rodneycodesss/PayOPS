import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  ShieldCheck,
  Play,
  Download,
  Key,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Code,
  X,
  ExternalLink,
  Clock,
  Trash2,
  Plus,
  Terminal,
} from 'lucide-react';
import { apiRequest } from '../services/api';

interface WorkflowMeta {
  id: string;
  name: string;
  group: string;
  file: string;
  schedule: string;
  description: string;
  is_available: boolean;
}

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface JobItem {
  id: string;
  job_type: string;
  trigger_source: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  result_summary: any;
}

const AVAILABLE_SCOPES = [
  { code: 'automation:run', desc: 'Execute on-demand automation jobs' },
  { code: 'automation:view', desc: 'Read workflows and job execution logs' },
  { code: 'payment:view', desc: 'Read customer payment records' },
  { code: 'payment:initiate', desc: 'Trigger STK push payment checkout' },
  { code: 'payment:record', desc: 'Record validated M-PESA & Bank payments' },
  { code: 'bank:import', desc: 'Ingest and deduplicate bank statement feeds' },
  { code: 'reconciliation:run', desc: 'Run deterministic 5-tier reconciliation rules' },
  { code: 'reconciliation:view', desc: 'View exceptions and match audit trails' },
  { code: 'etims:review', desc: 'Review and batch invoices for eTIMS compliance' },
  { code: 'invoice:view', desc: 'Query sales invoices and customer balances' },
  { code: 'report:view', desc: 'Generate daily collections and audit reports' },
];

export const AutomationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'credentials' | 'executions'>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowMeta[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Workflow JSON modal
  const [selectedWfJson, setSelectedWfJson] = useState<{ id: string; name: string; content: string } | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // New API Key form modal
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState<boolean>(false);
  const [keyName, setKeyName] = useState<string>('n8n Orchestrator Service Account');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'automation:run',
    'automation:view',
    'payment:view',
    'payment:initiate',
    'payment:record',
    'reconciliation:run',
  ]);
  const [expiresInDays, setExpiresInDays] = useState<number>(90);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  const fetchWorkflows = async () => {
    try {
      const data = await apiRequest<WorkflowMeta[]>('/automations/workflows');
      setWorkflows(data);
    } catch {
      // Fallback fallback list if offline
      setWorkflows([
        { id: 'WF01', name: 'M-PESA Intake Polling', group: 'Payments', file: 'WF01_mpesa_intake.json', schedule: 'Continuous (every 1 min)', description: 'Polls M-PESA Daraja API or ingestion queue for newly arrived Paybill/Till transactions.', is_available: true },
        { id: 'WF02', name: 'STK Push Initiation Trigger', group: 'Payments', file: 'WF02_stk_push_initiation.json', schedule: 'On-demand webhook', description: 'Triggered by order checkouts to initiate real-time Daraja STK Push prompts on customer phones.', is_available: true },
        { id: 'WF03', name: 'STK Callback Webhook Processor', group: 'Payments', file: 'WF03_callback_processing.json', schedule: 'Inbound webhook', description: 'Processes asynchronous Safaricom callback confirmations with idempotency deduplication.', is_available: true },
        { id: 'WF04', name: 'Invoice Auto-Reconciliation', group: 'Reconciliation', file: 'WF04_invoice_reconciliation.json', schedule: 'Daily at 02:00 EAT', description: 'Executes 5-tier deterministic rules matching payments to open sales invoices.', is_available: true },
        { id: 'WF05', name: 'Unmatched Exceptions Alert', group: 'Reconciliation', file: 'WF05_unmatched_exceptions.json', schedule: 'Daily at 06:00 EAT', description: 'Scans unresolved exceptions older than 24 hours and alerts operations staff.', is_available: true },
        { id: 'WF06', name: 'Bank Statement Ingest Pipeline', group: 'Reconciliation', file: 'WF06_bank_import.json', schedule: 'Continuous / Webhook', description: 'Consumes bank transaction feeds, validates SHA-256 idempotency, and stages records.', is_available: true },
        { id: 'WF07', name: 'Daily Bank Reconciliation', group: 'Reconciliation', file: 'WF07_daily_bank_reconciliation.json', schedule: 'Daily at 23:00 EAT', description: 'Reconciles general ledger bank accounts against cleared bank statement lines.', is_available: true },
        { id: 'WF08', name: 'eTIMS Submission Queue (Manual Mode)', group: 'Tax', file: 'WF08_etims_submission_queue.json', schedule: 'Batched (every 15 min)', description: 'Enqueues eligible sales invoices for KRA compliance tracking in verified manual mode.', is_available: true },
        { id: 'WF10', name: 'Customer Invoice Delivery (Email)', group: 'Customer Comms', file: 'WF10_invoice_delivery.json', schedule: 'Instant on Issue', description: 'Dispatches branded invoice PDFs via transactional SMTP email upon issuance.', is_available: true },
        { id: 'WF11', name: 'Payment Reminder Notifications', group: 'Customer Comms', file: 'WF11_payment_reminders.json', schedule: 'Weekly (Mon 09:00 EAT)', description: 'Calculates overdue aging buckets and sends gentle email reminder notices.', is_available: true },
        { id: 'WF12', name: 'Daily Executive Financial Report', group: 'Reporting', file: 'WF12_daily_financial_report.json', schedule: 'Daily at 07:00 EAT', description: 'Generates cross-channel daily collections summary for business management.', is_available: true },
      ]);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const data = await apiRequest<ApiKeyItem[]>('/api-keys/');
      setApiKeys(data);
    } catch {
      setApiKeys([]);
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await apiRequest<JobItem[]>('/automations/jobs');
      setJobs(data);
    } catch {
      setJobs([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchWorkflows(), fetchApiKeys(), fetchJobs()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTriggerRun = async (wfId: string) => {
    setTriggeringId(wfId);
    try {
      const res = await apiRequest<{ status: string; summary: any }>(`/automations/jobs/${wfId}/run`, {
        method: 'POST',
      });
      showNotification(`Workflow ${wfId} dispatched successfully! Status: ${res.status}`);
      await fetchJobs();
    } catch (err: any) {
      showNotification(`Failed to trigger ${wfId}: ${err.message}`, 'error');
    } finally {
      setTriggeringId(null);
    }
  };

  const handleViewJson = async (wf: WorkflowMeta) => {
    try {
      const data = await apiRequest<any>(`/automations/workflows/${wf.id}/content`);
      setSelectedWfJson({
        id: wf.id,
        name: wf.name,
        content: JSON.stringify(data, null, 2),
      });
    } catch (err: any) {
      showNotification(`Could not load JSON for ${wf.id}: ${err.message}`, 'error');
    }
  };

  const handleDownloadJson = (wfId: string, content: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wfId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ raw_api_key: string }>('/api-keys/', {
        method: 'POST',
        body: JSON.stringify({
          name: keyName,
          scopes: selectedScopes,
          expires_in_days: expiresInDays,
        }),
      });
      setNewlyCreatedKey(res.raw_api_key);
      showNotification('Service account API key created successfully!');
      await fetchApiKeys();
    } catch (err: any) {
      showNotification(`Failed to create API key: ${err.message}`, 'error');
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? n8n workflows using this key will immediately fail authentication.')) {
      return;
    }
    try {
      await apiRequest(`/api-keys/${id}`, { method: 'DELETE' });
      showNotification('API key revoked.');
      await fetchApiKeys();
    } catch (err: any) {
      showNotification(`Revoke failed: ${err.message}`, 'error');
    }
  };

  const toggleScope = (scopeCode: string) => {
    if (selectedScopes.includes(scopeCode)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scopeCode));
    } else {
      setSelectedScopes([...selectedScopes, scopeCode]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl border text-sm flex items-center space-x-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/90 border-red-500/50 text-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">n8n Automation Engine</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              11 Workflows Ready
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Orchestration platform for continuous M-PESA ingestion, automated 5-tier invoice matching, customer reminders, and executive reporting.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsNewKeyModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium text-xs transition shadow-sm"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Generate n8n API Key</span>
          </button>
          <div className="flex items-center space-x-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-[#11223A] border border-[#1E2E48] text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero Direct DB Access</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 border-b border-[#1E2E48]">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'workflows'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Workflows Catalog ({workflows.length})
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'credentials'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          API Keys & Connectivity ({apiKeys.length})
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'executions'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Execution History & Logs ({jobs.length})
        </button>
      </div>

      {/* Tab 1: Workflows Catalog */}
      {activeTab === 'workflows' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0B192C] border border-[#1E2E48] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>
                Workflows run inside your n8n Docker container and communicate exclusively via authenticated backend REST endpoints.
              </span>
            </div>
            <button
              onClick={loadData}
              className="flex items-center space-x-1 text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          <div className="rounded-xl bg-[#0B192C] border border-[#1E2E48] overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px] font-mono">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Workflow Name & Group</th>
                    <th className="py-3 px-4">Trigger & Cadence</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2E48]/60 font-sans">
                  {workflows.map((wf) => (
                    <tr key={wf.id} className="hover:bg-[#11223A]/40 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                        {wf.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{wf.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">{wf.description}</div>
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-[#11223A] text-slate-300 border border-[#1E2E48]">
                            {wf.group}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{wf.schedule}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Ready (v1.0)</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewJson(wf)}
                            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#11223A] hover:bg-[#1A3358] border border-[#1E2E48] text-slate-200 text-xs transition"
                            title="Inspect or export importable workflow JSON"
                          >
                            <Code className="w-3.5 h-3.5 text-slate-400" />
                            <span>Export JSON</span>
                          </button>
                          <button
                            onClick={() => handleTriggerRun(wf.id)}
                            disabled={triggeringId === wf.id}
                            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-medium text-xs transition"
                            title="Execute an on-demand manual trigger now"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{triggeringId === wf.id ? 'Running...' : 'Trigger Run'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: API Keys & Connectivity */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          {/* Quick Setup Environment Snippet */}
          <div className="p-5 rounded-xl bg-[#0B192C] border border-[#1E2E48] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">n8n Docker Compose Environment Variables</h3>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `# Rodstar PayOps Service Account for n8n\nPAYOPS_API_KEY=${apiKeys[0]?.key_prefix || 'rpo_live_YOUR_KEY_HERE'}...\nPAYOPS_BACKEND_URL=http://backend:8000\nWEBHOOK_URL=https://payops.rodstartechdevs.co.ke/n8n/`
                  );
                  showNotification('Copied environment configuration snippet to clipboard!');
                }}
                className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Config</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-lg bg-[#070F1E] border border-[#1E2E48] text-xs font-mono text-emerald-300 overflow-x-auto">
{`# Add to your n8n environment or .env file:
PAYOPS_API_KEY=${apiKeys[0]?.key_prefix ? `${apiKeys[0].key_prefix}...` : 'rpo_live_YOUR_KEY_HERE'}
PAYOPS_BACKEND_URL=http://backend:8000
WEBHOOK_URL=https://payops.rodstartechdevs.co.ke/n8n/`}
            </pre>
            <p className="text-[11px] text-slate-400">
              Every workflow uses the <code className="text-slate-200">X-API-Key</code> header to query and mutate records. Direct database ports (5432) are strictly prohibited for n8n.
            </p>
          </div>

          {/* Newly Generated API Key Reveal Modal / Banner */}
          {newlyCreatedKey && (
            <div className="p-5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>New Service Account API Key Created</span>
                </div>
                <button
                  onClick={() => setNewlyCreatedKey(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs text-emerald-200">
                Please copy this key now. For security purposes, it will never be displayed again.
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={newlyCreatedKey}
                  className="w-full px-3 py-2 rounded-lg bg-[#070F1E] border border-emerald-500/40 text-emerald-300 font-mono text-xs select-all focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newlyCreatedKey);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium text-xs flex items-center space-x-1 shrink-0"
                >
                  {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Keys Table */}
          <div className="rounded-xl bg-[#0B192C] border border-[#1E2E48] overflow-hidden">
            <div className="p-4 border-b border-[#1E2E48] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Active Service Account API Keys</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scoped authentication credentials for background orchestrators.
                </p>
              </div>
              <button
                onClick={() => setIsNewKeyModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Key</span>
              </button>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left font-mono">
                <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Key Name</th>
                    <th className="py-3 px-4">Prefix</th>
                    <th className="py-3 px-4">Granted Scopes</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4">Last Used</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2E48]/60 font-sans">
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No service account API keys created yet. Click "Generate n8n API Key" to provision credentials.
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-[#11223A]/40 transition">
                        <td className="py-3 px-4 font-medium text-white">
                          <div className="flex items-center space-x-2">
                            <Key className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{key.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">{key.key_prefix}...</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {key.scopes.map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#11223A] text-slate-300 border border-[#1E2E48]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {key.last_used_at ? new Date(key.last_used_at).toLocaleTimeString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRevokeApiKey(key.id)}
                            className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Execution History & Logs */}
      {activeTab === 'executions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0B192C] border border-[#1E2E48] flex items-center justify-between text-xs">
            <span className="text-slate-300">
              Audit log of all automated runs, whether triggered by n8n cron schedules, webhooks, or manual UI actions.
            </span>
            <button
              onClick={fetchJobs}
              className="flex items-center space-x-1 text-slate-400 hover:text-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Runs</span>
            </button>
          </div>

          <div className="rounded-xl bg-[#0B192C] border border-[#1E2E48] overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left font-mono">
                <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Run ID</th>
                    <th className="py-3 px-4">Workflow</th>
                    <th className="py-3 px-4">Trigger Source</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Result Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2E48]/60 font-sans">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No automation jobs recorded yet. Trigger a workflow run above to see live executions.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-[#11223A]/40 transition">
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {job.id.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                          {job.job_type}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                          {job.trigger_source}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {new Date(job.started_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              job.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                          {JSON.stringify(job.result_summary || {})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Workflow JSON Viewer & Download */}
      {selectedWfJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-xl bg-[#0B192C] border border-[#1E2E48] shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#1E2E48] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Workflow Definition: {selectedWfJson.id}</h3>
                <p className="text-xs text-slate-400">{selectedWfJson.name}</p>
              </div>
              <button
                onClick={() => setSelectedWfJson(null)}
                className="p-1 rounded hover:bg-[#11223A] text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <pre className="p-4 rounded-lg bg-[#070F1E] border border-[#1E2E48] text-xs font-mono text-emerald-300 overflow-x-auto select-all max-h-[50vh]">
                {selectedWfJson.content}
              </pre>
            </div>

            <div className="p-4 border-t border-[#1E2E48] flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                In n8n, click <span className="text-slate-200">Workflows &rarr; Import from File / URL</span> or paste this JSON directly.
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedWfJson.content);
                    setCopiedJson(true);
                    setTimeout(() => setCopiedJson(false), 2000);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#11223A] hover:bg-[#1A3358] border border-[#1E2E48] text-slate-200 text-xs font-medium"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={() => handleDownloadJson(selectedWfJson.id, selectedWfJson.content)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Service Account API Key */}
      {isNewKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-[#0B192C] border border-[#1E2E48] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2E48] pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Generate n8n Service Account API Key</h3>
              </div>
              <button
                onClick={() => setIsNewKeyModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApiKey} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Key Description / Purpose</label>
                <input
                  type="text"
                  required
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. n8n Primary VPS Worker"
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Expiration Period</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days (Recommended)</option>
                  <option value={180}>180 Days</option>
                  <option value={365}>1 Year</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">Granted Scopes (Least Privilege)</label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto p-2 rounded-lg bg-[#070F1E] border border-[#1E2E48]">
                  {AVAILABLE_SCOPES.map((sc) => (
                    <label
                      key={sc.code}
                      className="flex items-start space-x-2.5 p-1.5 rounded hover:bg-[#11223A] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(sc.code)}
                        onChange={() => toggleScope(sc.code)}
                        className="mt-0.5 rounded border-[#1E2E48] bg-[#0B192C] text-emerald-500 focus:ring-0"
                      />
                      <div>
                        <div className="font-mono text-emerald-400 font-semibold">{sc.code}</div>
                        <div className="text-[11px] text-slate-400">{sc.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E2E48] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewKeyModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-[#11223A] hover:bg-[#1A3358] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedScopes.length === 0}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-medium"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
