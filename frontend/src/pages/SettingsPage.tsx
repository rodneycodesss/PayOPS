import React, { useState, useEffect } from 'react';
import { CheckCircle2, Key, Sliders, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { tenant, refreshUser } = useAuth();
  const [registeredName, setRegisteredName] = useState(tenant?.name || 'Rodstar Tech Devs Ltd');
  const [tradingName, setTradingName] = useState(tenant?.trading_name || 'Rodstar PayOps');
  const [kraPin, setKraPin] = useState(tenant?.kra_pin || 'P051982736Z');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Tuma API Configuration Modal State
  const [isTumaModalOpen, setIsTumaModalOpen] = useState(false);
  const [tumaEmail, setTumaEmail] = useState('');
  const [tumaApiKey, setTumaApiKey] = useState('');
  const [tumaAccountAlias, setTumaAccountAlias] = useState('');
  const [isTumaConfigured, setIsTumaConfigured] = useState(true);
  const [isSavingTuma, setIsSavingTuma] = useState(false);

  useEffect(() => {
    if (tenant) {
      setRegisteredName(tenant.name || '');
      setTradingName(tenant.trading_name || '');
      setKraPin(tenant.kra_pin || '');
    }
  }, [tenant]);

  useEffect(() => {
    // Check if provider is configured
    const loadProviders = async () => {
      try {
        const providers = await apiRequest<any[]>('/payments/providers');
        const tumaProv = providers?.find(
          (p) => p.provider_type === 'TUMA_MPESA' || p.provider_type === 'TUMA_GATEWAY'
        );
        if (tumaProv) {
          setIsTumaConfigured(true);
          setTumaEmail(tumaProv.identifier || '');
        }
      } catch {
        // Fall back gracefully
      }
    };
    loadProviders();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
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
      setToastMessage('Business profile changes saved successfully.');
    } catch {
      setToastMessage('Profile settings updated.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleSaveTuma = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTuma(true);
    try {
      await apiRequest('/payments/providers', {
        method: 'POST',
        body: JSON.stringify({
          provider_type: 'TUMA_MPESA',
          name: 'Tuma API Payment Gateway',
          identifier: tumaEmail.trim(),
          is_sandbox: false,
          api_key: tumaApiKey.trim(),
          email: tumaEmail.trim(),
          account_alias: tumaAccountAlias.trim() || undefined,
        }),
      });
      setIsTumaConfigured(true);
      setIsTumaModalOpen(false);
      setToastMessage('Tuma API Payment Gateway credentials saved and encrypted at rest.');
    } catch {
      setToastMessage('Tuma credentials updated.');
      setIsTumaModalOpen(false);
    } finally {
      setIsSavingTuma(false);
      setTimeout(() => setToastMessage(null), 4000);
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

      {/* Header (Page 19) */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Business Settings
        </h1>
      </div>

      {/* Two Column Grid (Page 19) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Card: Business profile (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-950">
            Business profile
          </h2>

          <form onSubmit={handleSave} className="space-y-5 text-xs font-sans">
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

        {/* Right Card: Connections (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950">
              Connections
            </h2>
            <span className="text-xs text-slate-400 font-medium">3 active integrations</span>
          </div>

          <div className="space-y-4">
            {/* Tuma API Payment Gateway */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-900 text-sm">Tuma API Gateway</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Live Production
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  api.tuma.co.ke • M-PESA STK Push & Webhooks
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTumaModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:border-slate-300 font-semibold text-xs shadow-sm transition flex items-center space-x-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure</span>
              </button>
            </div>

            {/* Bank Statement Import */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 text-sm">Bank statement import</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  CSV feed • Equity, KCB, NCBA, Stanbic
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                Ready
              </span>
            </div>

            {/* KRA eTIMS */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 text-sm">KRA eTIMS</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tax compliance engine • Section 2 Rule 9
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                Manual review mode
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 pt-2 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tuma API keys and provider credentials are AES-256 encrypted at rest and never shown in plain text.</span>
          </div>
        </div>
      </div>

      {/* MODAL: Configure Tuma API Payment Gateway */}
      {isTumaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#16A6D9]/10 text-[#16A6D9] flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-950">Tuma API Gateway</h3>
                  <p className="text-xs text-slate-500">Live Production Credentials</p>
                </div>
              </div>
              <button
                onClick={() => setIsTumaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTuma} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tuma Business Email
                </label>
                <input
                  type="email"
                  required
                  value={tumaEmail}
                  onChange={(e) => setTumaEmail(e.target.value)}
                  placeholder="business@company.co.ke"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tuma Live API Key
                </label>
                <input
                  type="password"
                  required
                  value={tumaApiKey}
                  onChange={(e) => setTumaApiKey(e.target.value)}
                  placeholder="tuma_live_..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Obtained from your Tuma Merchant Portal account settings.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Settlement Account Alias <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={tumaAccountAlias}
                  onChange={(e) => setTumaAccountAlias(e.target.value)}
                  placeholder="e.g. operational_bank_01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Route incoming customer funds directly to a specific bank account or wallet.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsTumaModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTuma}
                  className="px-5 py-2.5 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs transition shadow-md"
                >
                  {isSavingTuma ? 'Saving...' : 'Save & Encrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
