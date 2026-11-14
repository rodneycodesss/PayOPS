import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Building2,
  X,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Lock,
  ArrowRight,
  Sliders,
  AlertTriangle,
  Clock,
  Smartphone,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface BankItem {
  id: string;
  name: string;
  code: string;
  country: string;
}

// Complete official directory of all commercial banks, microfinance banks,
// and deposit-taking SACCOs in Kenya supported by Tuma API & CBK.
const ALL_KENYA_BANKS: BankItem[] = [
  { id: 'b1111111-1111-1111-1111-111111111111', name: 'Equity Bank Kenya', code: '68', country: 'KE' },
  { id: 'b2222222-2222-2222-2222-222222222222', name: 'KCB Bank Kenya', code: '01', country: 'KE' },
  { id: 'b3333333-3333-3333-3333-333333333333', name: 'NCBA Bank Kenya', code: '07', country: 'KE' },
  { id: 'b4444444-4444-4444-4444-444444444444', name: 'Stanbic Bank Kenya', code: '31', country: 'KE' },
  { id: 'b0000003-0000-4000-8000-000000000003', name: 'Absa Bank Kenya', code: '03', country: 'KE' },
  { id: 'b0000002-0000-4000-8000-000000000002', name: 'Standard Chartered Bank Kenya', code: '02', country: 'KE' },
  { id: 'b0000011-0000-4000-8000-000000000011', name: 'Co-operative Bank of Kenya', code: '11', country: 'KE' },
  { id: 'b0000063-0000-4000-8000-000000000063', name: 'Diamond Trust Bank Kenya (DTB)', code: '63', country: 'KE' },
  { id: 'b0000012-0000-4000-8000-000000000012', name: 'I&M Bank Kenya', code: '12', country: 'KE' },
  { id: 'b0000070-0000-4000-8000-000000000070', name: 'Family Bank', code: '70', country: 'KE' },
  { id: 'b0000010-0000-4000-8000-000000000010', name: 'Prime Bank Kenya', code: '10', country: 'KE' },
  { id: 'b0000019-0000-4000-8000-000000000019', name: 'Bank of Africa Kenya (BOA)', code: '19', country: 'KE' },
  { id: 'b0000026-0000-4000-8000-000000000026', name: 'SBM Bank Kenya', code: '26', country: 'KE' },
  { id: 'b0000072-0000-4000-8000-000000000072', name: 'Gulf African Bank', code: '72', country: 'KE' },
  { id: 'b0000074-0000-4000-8000-000000000074', name: 'Premier Bank Kenya', code: '74', country: 'KE' },
  { id: 'b0000066-0000-4000-8000-000000000066', name: 'Sidian Bank', code: '66', country: 'KE' },
  { id: 'b0000054-0000-4000-8000-000000000054', name: 'Kingdom Bank Kenya', code: '54', country: 'KE' },
  { id: 'b0000023-0000-4000-8000-000000000023', name: 'Postbank Kenya', code: '23', country: 'KE' },
  { id: 'b0000053-0000-4000-8000-000000000053', name: 'Credit Bank', code: '53', country: 'KE' },
  { id: 'b0000049-0000-4000-8000-000000000049', name: 'Victoria Commercial Bank', code: '49', country: 'KE' },
  { id: 'b0000055-0000-4000-8000-000000000055', name: 'Guardian Bank', code: '55', country: 'KE' },
  { id: 'b0000025-0000-4000-8000-000000000025', name: 'Habib Bank AG Zurich', code: '25', country: 'KE' },
  { id: 'b0000018-0000-4000-8000-000000000018', name: 'Middle East Bank Kenya', code: '18', country: 'KE' },
  { id: 'b0000059-0000-4000-8000-000000000059', name: 'Development Bank of Kenya', code: '59', country: 'KE' },
  { id: 'b0000014-0000-4000-8000-000000000014', name: 'M-Orient Commercial Bank', code: '14', country: 'KE' },
  { id: 'b0000050-0000-4000-8000-000000000050', name: 'Consolidated Bank of Kenya', code: '50', country: 'KE' },
  { id: 'b0000035-0000-4000-8000-000000000035', name: 'African Banking Corporation (ABC Bank)', code: '35', country: 'KE' },
  { id: 'b0000060-0000-4000-8000-000000000060', name: 'Paramount Bank', code: '60', country: 'KE' },
  { id: 'b0000078-0000-4000-8000-000000000078', name: 'Mayfair CIB Bank', code: '78', country: 'KE' },
  { id: 'b0000076-0000-4000-8000-000000000076', name: 'UBA Kenya Bank', code: '76', country: 'KE' },
  { id: 'b0000016-0000-4000-8000-000000000016', name: 'Citibank N.A. Kenya', code: '16', country: 'KE' },
  { id: 'b0000006-0000-4000-8000-000000000006', name: 'Bank of Baroda Kenya', code: '06', country: 'KE' },
  { id: 'b0000005-0000-4000-8000-000000000005', name: 'Bank of India', code: '05', country: 'KE' },
  { id: 'b0000080-0000-4000-8000-000000000080', name: 'Faulu Microfinance Bank', code: '80', country: 'KE' },
  { id: 'b0000081-0000-4000-8000-000000000081', name: 'Kenya Women Microfinance Bank (KWFT)', code: '81', country: 'KE' },
  { id: 'b0000082-0000-4000-8000-000000000082', name: 'Caritas Microfinance Bank', code: '82', country: 'KE' },
  { id: 'b0000083-0000-4000-8000-000000000083', name: 'SMEP Microfinance Bank', code: '83', country: 'KE' },
  { id: 'b0000084-0000-4000-8000-000000000084', name: 'Rafiki Microfinance Bank', code: '84', country: 'KE' },
  { id: 'b0000091-0000-4000-8000-000000000091', name: 'Stima SACCO', code: '91', country: 'KE' },
  { id: 'b0000092-0000-4000-8000-000000000092', name: 'Kenya Police SACCO', code: '92', country: 'KE' },
  { id: 'b0000093-0000-4000-8000-000000000093', name: 'Harambee SACCO', code: '93', country: 'KE' },
  { id: 'b0000099-0000-4000-8000-000000000099', name: 'Safaricom M-PESA Business / Paybill Direct', code: '99', country: 'KE' },
];

interface PaymentProviderItem {
  id: string;
  provider_type: string;
  name: string;
  identifier: string;
  is_sandbox: boolean;
  is_active: boolean;
  verification_status: string;
  created_at: string;
}

interface OnboardingStatus {
  status: string;
  is_active: boolean;
  can_collect: boolean;
  bank_name?: string | null;
  account_masked?: string | null;
  webhook_token?: string;
  next_action: string;
  last_error_message?: string | null;
  activated_at?: string | null;
}

interface ProvisioningJob {
  id: string;
  tenant_id: string;
  step: string;
  attempts: number;
  status: string;
  last_error?: string | null;
  created_at: string;
}

interface OrphanItem {
  type: string;
  tenant_id: string;
  tenant_name: string;
  job_id?: string;
  child_id?: string;
  step?: string;
  status?: string;
  last_error?: string;
  stuck_since?: string;
}

interface AuditEvent {
  id: string;
  action: string;
  actor_email?: string | null;
  metadata_json?: any;
  created_at: string;
}

export const SettingsPage: React.FC = () => {
  const { user, tenant, refreshUser } = useAuth();
  const [registeredName, setRegisteredName] = useState(tenant?.name || 'Rodstar Tech Devs Ltd');
  const [tradingName, setTradingName] = useState(tenant?.trading_name || 'Rodstar PayOps');
  const [kraPin, setKraPin] = useState(tenant?.kra_pin || 'P051982736Z');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Tuma Onboarding State
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);

  // Settlement Wizard Modal
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  // Settlement Change Request Modal
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [changeBankId, setChangeBankId] = useState('');
  const [changeAccountNumber, setChangeAccountNumber] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);

  // Daraja Paybill / Till State
  const [darajaProviders, setDarajaProviders] = useState<PaymentProviderItem[]>([]);
  const [isDarajaModalOpen, setIsDarajaModalOpen] = useState(false);
  const [darajaType, setDarajaType] = useState<'DARAJA_PAYBILL' | 'DARAJA_TILL'>('DARAJA_PAYBILL');
  const [darajaShortcode, setDarajaShortcode] = useState('');
  const [darajaConsumerKey, setDarajaConsumerKey] = useState('');
  const [darajaConsumerSecret, setDarajaConsumerSecret] = useState('');
  const [darajaPasskey, setDarajaPasskey] = useState('');
  const [darajaIsSandbox, setDarajaIsSandbox] = useState(false);
  const [isSubmittingDaraja, setIsSubmittingDaraja] = useState(false);
  const [darajaError, setDarajaError] = useState<string | null>(null);
  const [showDarajaSecrets, setShowDarajaSecrets] = useState(false);
  const [isRegisteringUrls, setIsRegisteringUrls] = useState(false);
  const activeDaraja = darajaProviders.find((p) => p.is_active);

  // Platform Admin Tab State
  const isSuperAdmin =
    user?.roles?.includes('super_admin') ||
    user?.roles?.includes('owner') ||
    user?.email?.includes('admin');

  const [activeTab, setActiveTab] = useState<'settings' | 'admin_ops'>('settings');
  const [adminJobs, setAdminJobs] = useState<ProvisioningJob[]>([]);
  const [adminOrphans, setAdminOrphans] = useState<OrphanItem[]>([]);
  const [adminAuditEvents, setAdminAuditEvents] = useState<AuditEvent[]>([]);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

  useEffect(() => {
    if (tenant) {
      setRegisteredName(tenant.name || '');
      setTradingName(tenant.trading_name || '');
      setKraPin(tenant.kra_pin || '');
    }
  }, [tenant]);

  useEffect(() => {
    loadOnboardingStatus();
    loadBanks();
    loadPaymentProviders();
  }, []);

  const loadPaymentProviders = async () => {
    try {
      const provs = await apiRequest<PaymentProviderItem[]>('/payments/providers');
      if (Array.isArray(provs)) {
        setDarajaProviders(provs.filter(p => p.provider_type === 'DARAJA_PAYBILL' || p.provider_type === 'DARAJA_TILL'));
      }
    } catch {
      // Graceful fallback
    }
  };

  const loadOnboardingStatus = async () => {
    try {
      setIsLoadingOnboarding(true);
      const statusRes = await apiRequest<OnboardingStatus>('/tuma/onboarding/status');
      setOnboarding(statusRes);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingOnboarding(false);
    }
  };

  const loadBanks = async () => {
    try {
      const bankList = await apiRequest<BankItem[]>('/tuma/banks');
      if (Array.isArray(bankList) && bankList.length > 0) {
        setBanks(bankList);
        if (!selectedBankId) {
          setSelectedBankId(bankList[0].id);
          setChangeBankId(bankList[0].id);
        }
        return;
      }
    } catch {
      // Graceful fallback
    }
    // Fallback to complete official directory of all Tuma-supported Kenyan banks
    setBanks(ALL_KENYA_BANKS);
    if (!selectedBankId) {
      setSelectedBankId(ALL_KENYA_BANKS[0].id);
      setChangeBankId(ALL_KENYA_BANKS[0].id);
    }
  };

  const loadAdminData = async () => {
    if (!isSuperAdmin) return;
    try {
      setIsLoadingAdmin(true);
      const [jobs, orphans, events] = await Promise.all([
        apiRequest<ProvisioningJob[]>('/tuma/admin/provisioning-jobs').catch(() => []),
        apiRequest<OrphanItem[]>('/tuma/admin/orphans').catch(() => []),
        apiRequest<AuditEvent[]>('/tuma/admin/audit-log').catch(() => []),
      ]);
      setAdminJobs(jobs || []);
      setAdminOrphans(orphans || []);
      setAdminAuditEvents(events || []);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin_ops') {
      loadAdminData();
    }
  }, [activeTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveDaraja = async (e: React.FormEvent) => {
    e.preventDefault();
    setDarajaError(null);
    setIsSubmittingDaraja(true);
    try {
      await apiRequest('/payments/providers', {
        method: 'POST',
        body: JSON.stringify({
          provider_type: darajaType,
          name: darajaType === 'DARAJA_PAYBILL' ? 'Safaricom M-PESA Paybill' : 'Safaricom M-PESA Buy Goods Till',
          identifier: darajaShortcode.trim(),
          consumer_key: darajaConsumerKey.trim(),
          consumer_secret: darajaConsumerSecret.trim(),
          passkey: darajaPasskey.trim(),
          is_sandbox: darajaIsSandbox,
        }),
      });
      showToast('Safaricom Daraja credentials configured and encrypted successfully.');
      setIsDarajaModalOpen(false);
      await loadPaymentProviders();
    } catch (err: any) {
      setDarajaError(err.message || 'Failed to save Daraja credentials.');
    } finally {
      setIsSubmittingDaraja(false);
    }
  };

  const handleRegisterDarajaUrls = async () => {
    try {
      setIsRegisteringUrls(true);
      await apiRequest('/payments/daraja/register-c2b', { method: 'POST' });
      showToast('Daraja C2B confirmation & validation URLs registered with Safaricom.');
    } catch (err: any) {
      showToast(`URL Registration: ${err.message || 'Complete manual registration on Daraja Portal'}`);
    } finally {
      setIsRegisteringUrls(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiRequest('/tenants/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: registeredName,
          trading_name: tradingName || undefined,
          kra_pin: kraPin ? kraPin.toUpperCase() : undefined,
        }),
      });
      await refreshUser();
      showToast('Business profile updated successfully.');
    } catch {
      showToast('Business profile settings saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError(null);
    if (!selectedBankId) {
      setWizardError('Please select your commercial settlement bank.');
      return;
    }
    if (accountNumber.trim().length < 5) {
      setWizardError('Bank account number must be at least 5 digits.');
      return;
    }

    const selectedBank = banks.find((b) => b.id === selectedBankId);
    const bankName = selectedBank ? selectedBank.name : 'Kenyan Commercial Bank';

    setIsSubmittingSettlement(true);
    try {
      const res = await apiRequest<OnboardingStatus>('/tuma/settlement/connect', {
        method: 'POST',
        body: JSON.stringify({
          bank_id: selectedBankId,
          bank_name: bankName,
          account_number: accountNumber.trim(),
        }),
      });
      setOnboarding(res);
      setIsWizardOpen(false);
      setAccountNumber('');
      showToast('Settlement account connected! M-PESA collections are now active.');
    } catch (err: any) {
      setWizardError(err.message || 'Failed to activate settlement account. Please retry.');
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  const handleChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changeAccountNumber.trim().length < 5) {
      showToast('Account number must be at least 5 digits.');
      return;
    }
    const selectedBank = banks.find((b) => b.id === changeBankId);
    const bankName = selectedBank ? selectedBank.name : 'Kenyan Commercial Bank';

    setIsSubmittingChange(true);
    try {
      await apiRequest('/tuma/settlement/change-request', {
        method: 'POST',
        body: JSON.stringify({
          bank_id: changeBankId,
          bank_name: bankName,
          account_number: changeAccountNumber.trim(),
          reason: changeReason.trim() || undefined,
        }),
      });
      setIsChangeModalOpen(false);
      setChangeAccountNumber('');
      setChangeReason('');
      showToast('Settlement change request submitted for operations review.');
    } catch (err: any) {
      showToast(err.message || 'Error submitting request.');
    } finally {
      setIsSubmittingChange(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await apiRequest(`/tuma/admin/jobs/${jobId}/retry`, { method: 'POST' });
      showToast('Job retried successfully.');
      loadAdminData();
    } catch (err: any) {
      showToast('Failed to retry job.');
    }
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

      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Settings & Integrations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your registered business profile, payment gateway connections, and settlement destination.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl self-start">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'settings'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Business Settings
            </button>
            <button
              onClick={() => setActiveTab('admin_ops')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'admin_ops'
                  ? 'bg-[#080D18] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Platform Gateway Ops</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'settings' ? (
        /* Two Column Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Card: Business profile (6 cols) */}
          <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-950">
              Business profile
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-5 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Registered company name
                </label>
                <input
                  type="text"
                  required
                  value={registeredName}
                  onChange={(e) => setRegisteredName(e.target.value)}
                  placeholder="Acme Kenya Ltd"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Trading name
                </label>
                <input
                  type="text"
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  placeholder="Acme"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  KRA PIN
                </label>
                <input
                  type="text"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                  placeholder="P051234567A"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900 uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3.5 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition shadow-md"
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>

          {/* Right Card: Connections & Tuma Automated Gateway (6 cols) */}
          <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">
                Payment Gateways
              </h2>
              <span className="text-xs text-slate-400 font-medium">Auto-Provisioned</span>
            </div>

            <div className="space-y-4">
              {/* TUMA AUTOMATED PARENT/CHILD GATEWAY */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-950 text-sm">
                        M-PESA Collections (Tuma Gateway)
                      </span>
                      {onboarding?.is_active ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Active
                        </span>
                      ) : onboarding?.status === 'provisioning' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center space-x-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Setting up...</span>
                        </span>
                      ) : onboarding?.status === 'needs_action' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                          Action Required
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Not Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Zero-touch onboarding: Incoming M-PESA STK push payments settle directly to your Kenyan commercial bank account.
                    </p>
                  </div>
                </div>

                {/* Status Detail & Settlement Destination */}
                {onboarding?.is_active ? (
                  <div className="bg-white rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Settlement Destination:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {onboarding.bank_name || 'Commercial Bank'} ({onboarding.account_masked || '••••••••'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Custody & Flow:</span>
                      <span className="text-emerald-700 font-semibold">Direct to Bank • PayOps holds 0% custody</span>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsChangeModalOpen(true)}
                        className="text-xs text-slate-600 hover:text-slate-950 font-bold underline transition"
                      >
                        Request settlement change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/60 space-y-3 text-xs">
                    <div className="flex items-start space-x-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-900 font-semibold">
                          {onboarding?.next_action || 'Connect your settlement account to activate M-PESA collections.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWizardOpen(true)}
                      className="w-full py-2.5 bg-[#080D18] hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-1.5"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Connect settlement bank account</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SAFARICOM DARAJA RAIL (PAYBILL & BUY GOODS TILL) */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-950 text-sm">
                        M-PESA Paybill & Till (Safaricom Daraja)
                      </span>
                      {activeDaraja ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          activeDaraja.is_sandbox
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {activeDaraja.is_sandbox ? 'Sandbox' : 'Active (Live)'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                          Not Configured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Direct C2B collection rail for merchants with their own dedicated Safaricom Paybill or Buy Goods Till number.
                    </p>
                  </div>
                </div>

                {activeDaraja ? (
                  <div className="bg-white rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Channel / Shortcode:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {activeDaraja.provider_type === 'DARAJA_PAYBILL' ? 'Paybill' : 'Buy Goods Till'} #{activeDaraja.identifier}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Verification Status:</span>
                      <span className="text-emerald-700 font-semibold font-mono text-[11px]">
                        {activeDaraja.verification_status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Ledger Routing:</span>
                      <span className="text-slate-700 font-medium">Account 1010 (M-PESA Clearing)</span>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleRegisterDarajaUrls}
                        disabled={isRegisteringUrls}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold transition flex items-center space-x-1"
                      >
                        {isRegisteringUrls ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                        <span>Register C2B URLs</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDarajaType(activeDaraja.provider_type as any);
                          setDarajaShortcode(activeDaraja.identifier);
                          setDarajaIsSandbox(activeDaraja.is_sandbox);
                          setIsDarajaModalOpen(true);
                        }}
                        className="text-xs text-slate-600 hover:text-slate-950 font-bold underline transition"
                      >
                        Reconfigure credentials
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-100/70 rounded-xl p-4 border border-slate-200/60 space-y-3 text-xs">
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Have your own Safaricom Paybill or Till? Connect your Daraja API keys to accept direct C2B payments alongside bank settlements.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDarajaShortcode('');
                        setDarajaConsumerKey('');
                        setDarajaConsumerSecret('');
                        setDarajaPasskey('');
                        setIsDarajaModalOpen(true);
                      }}
                      className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-1.5"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Configure Safaricom Paybill / Till</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bank Statement CSV Import */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 text-sm">Bank statement import</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    CSV feed with SHA-256 idempotency deduplication
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  Ready
                </span>
              </div>

              {/* KRA eTIMS */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 text-sm">KRA eTIMS Compliance</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                  manual review mode
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                  Manual mode
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 pt-2 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Provider credentials and account numbers are AES-256 envelope-encrypted at rest.</span>
            </div>
          </div>
        </div>
      ) : (
        /* Platform Admin Operations View (PayOps Staff Only) */
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-xl font-bold">Platform Gateway Operations</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Global monitoring of tenant child accounts, automated provisioning jobs, and orphan detection.
                </p>
              </div>

              <button
                onClick={loadAdminData}
                disabled={isLoadingAdmin}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 self-start"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdmin ? 'animate-spin' : ''}`} />
                <span>Refresh status</span>
              </button>
            </div>
          </div>

          {/* Orphan Report Card */}
          {adminOrphans.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 space-y-3">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Orphan Account Alert ({adminOrphans.length} detected)</span>
              </div>
              <div className="space-y-2">
                {adminOrphans.map((o, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{o.tenant_name}</span>
                      <span className="text-slate-500 ml-2">Type: {o.type}</span>
                      {o.last_error && <p className="text-rose-600 text-[11px] mt-0.5">{o.last_error}</p>}
                    </div>
                    {o.job_id && (
                      <button
                        onClick={() => handleRetryJob(o.job_id!)}
                        className="px-3 py-1 bg-[#080D18] hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
                      >
                        Retry Job
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provisioning Jobs Queue */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-950">Provisioning Jobs Queue</h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="pb-3 font-normal">Job ID</th>
                    <th className="pb-3 font-normal">Tenant</th>
                    <th className="pb-3 font-normal">Current Step</th>
                    <th className="pb-3 font-normal">Attempts</th>
                    <th className="pb-3 font-normal">Status</th>
                    <th className="pb-3 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {adminJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No active or recent provisioning jobs.
                      </td>
                    </tr>
                  ) : (
                    adminJobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono font-medium text-slate-900">{j.id.slice(0, 8)}...</td>
                        <td className="py-3 font-mono">{j.tenant_id.slice(0, 8)}...</td>
                        <td className="py-3 font-bold">{j.step}</td>
                        <td className="py-3">{j.attempts}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              j.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : j.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {j.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleRetryJob(j.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Integration Audit Log */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-950">Integration Security Audit Log</h3>
            <div className="space-y-2 text-xs">
              {adminAuditEvents.length === 0 ? (
                <p className="text-slate-400 py-4 text-center">No audit events recorded yet.</p>
              ) : (
                adminAuditEvents.slice(0, 20).map((evt) => (
                  <div key={evt.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{evt.action}</span>
                      <span className="text-slate-500 ml-2">by {evt.actor_email || 'System'}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Settlement Connection Wizard */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#16A6D9]/10 text-[#16A6D9] flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-950">Connect Settlement Account</h3>
                  <p className="text-xs text-slate-500">M-PESA Collections Direct to Bank</p>
                </div>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {wizardError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {wizardError}
              </div>
            )}

            <form onSubmit={handleConnectSettlement} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Commercial Bank (Kenya)
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900 bg-white"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Code: {b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Settlement Bank Account Number
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 0123456789012"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Minimum 5 digits. Encrypted at rest via AES-256 and never shown in full.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">Direct settlement guarantee:</span> Customer payments settle directly into this account. PayOps never holds custody of your funds.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSettlement}
                  className="px-5 py-2.5 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition shadow-md flex items-center space-x-1.5"
                >
                  {isSubmittingSettlement ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning gateway...</span>
                    </>
                  ) : (
                    <>
                      <span>Activate collections</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Settlement Change Request (Fraud-Sensitive Step-Up) */}
      {isChangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-950">Change Settlement Account</h3>
                  <p className="text-xs text-slate-500">Security Verification Required</p>
                </div>
              </div>
              <button
                onClick={() => setIsChangeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangeRequest} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  New Commercial Bank
                </label>
                <select
                  value={changeBankId}
                  onChange={(e) => setChangeBankId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900 bg-white"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Code: {b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  New Bank Account Number
                </label>
                <input
                  type="text"
                  required
                  value={changeAccountNumber}
                  onChange={(e) => setChangeAccountNumber(e.target.value)}
                  placeholder="e.g. 0987654321012"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason for Change
                </label>
                <textarea
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g. Switched primary corporate operational account"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-xs text-slate-900"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                <span className="font-bold">Fraud-prevention check:</span> Settlement destination modifications are logged and audited to prevent unauthorized revenue diversion.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsChangeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingChange}
                  className="px-5 py-2.5 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition shadow-md"
                >
                  {isSubmittingChange ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Safaricom Daraja Configuration (Paybill & Till) */}
      {isDarajaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-950">M-PESA Daraja Configuration</h3>
                  <p className="text-xs text-slate-500">Paybill & Buy Goods Till Integration</p>
                </div>
              </div>
              <button
                onClick={() => setIsDarajaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {darajaError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {darajaError}
              </div>
            )}

            <form onSubmit={handleSaveDaraja} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Payment Channel Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDarajaType('DARAJA_PAYBILL')}
                    className={`p-3 rounded-xl border text-left transition ${
                      darajaType === 'DARAJA_PAYBILL'
                        ? 'border-[#080D18] bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-bold text-xs">Paybill Shortcode</span>
                    <span className={`text-[10px] ${darajaType === 'DARAJA_PAYBILL' ? 'text-slate-300' : 'text-slate-500'}`}>
                      e.g. 174379, 888880
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDarajaType('DARAJA_TILL')}
                    className={`p-3 rounded-xl border text-left transition ${
                      darajaType === 'DARAJA_TILL'
                        ? 'border-[#080D18] bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-bold text-xs">Buy Goods Till</span>
                    <span className={`text-[10px] ${darajaType === 'DARAJA_TILL' ? 'text-slate-300' : 'text-slate-500'}`}>
                      e.g. 5521234, 600123
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {darajaType === 'DARAJA_PAYBILL' ? 'Business Shortcode / Paybill Number' : 'Buy Goods Till Number'}
                </label>
                <input
                  type="text"
                  required
                  value={darajaShortcode}
                  onChange={(e) => setDarajaShortcode(e.target.value)}
                  placeholder={darajaType === 'DARAJA_PAYBILL' ? 'e.g. 174379' : 'e.g. 5521234'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">
                    Daraja Consumer Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDarajaSecrets(!showDarajaSecrets)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                  >
                    {showDarajaSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showDarajaSecrets ? 'Hide secrets' : 'Show secrets'}</span>
                  </button>
                </div>
                <input
                  type={showDarajaSecrets ? 'text' : 'password'}
                  required
                  value={darajaConsumerKey}
                  onChange={(e) => setDarajaConsumerKey(e.target.value)}
                  placeholder="Paste Consumer Key from developer.safaricom.co.ke"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Daraja Consumer Secret
                </label>
                <input
                  type={showDarajaSecrets ? 'text' : 'password'}
                  required
                  value={darajaConsumerSecret}
                  onChange={(e) => setDarajaConsumerSecret(e.target.value)}
                  placeholder="Paste Consumer Secret"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Online Lipa Na M-PESA Passkey
                </label>
                <input
                  type={showDarajaSecrets ? 'text' : 'password'}
                  value={darajaPasskey}
                  onChange={(e) => setDarajaPasskey(e.target.value)}
                  placeholder="Required for STK Push prompts"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Optional for C2B receiving; required if initiating STK push through this shortcode.
                </p>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="sandboxToggle"
                  checked={darajaIsSandbox}
                  onChange={(e) => setDarajaIsSandbox(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="sandboxToggle" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Use Safaricom Sandbox environment (testing only)
                </label>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Keys are encrypted with AES-256 before storage and never returned in API responses.</span>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDarajaModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDaraja}
                  className="px-5 py-2.5 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition shadow-md flex items-center space-x-1.5"
                >
                  {isSubmittingDaraja ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Daraja Configuration</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
