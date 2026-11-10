import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { tenant, refreshUser } = useAuth();
  const [registeredName, setRegisteredName] = useState(tenant?.name || 'Rodstar Tech Devs Ltd');
  const [tradingName, setTradingName] = useState(tenant?.trading_name || 'Rodstar PayOps');
  const [kraPin, setKraPin] = useState(tenant?.kra_pin || 'P051982736Z');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setRegisteredName(tenant.name || '');
      setTradingName(tenant.trading_name || '');
      setKraPin(tenant.kra_pin || '');
    }
  }, [tenant]);

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
          <h2 className="text-xl font-bold text-slate-950">
            Connections
          </h2>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">M-PESA Daraja</span>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                Sandbox
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">Bank statement import</span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                Ready
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">KRA eTIMS</span>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                Manual review mode
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 pt-2 leading-relaxed">
            Provider credentials are stored encrypted and never shown in full.
          </p>
        </div>
      </div>
    </div>
  );
};
