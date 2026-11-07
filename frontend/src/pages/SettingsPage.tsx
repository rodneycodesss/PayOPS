import React, { useEffect, useState } from 'react';
import { Building2, Save, MapPin, Plus } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../features/auth/AuthContext';

export const SettingsPage: React.FC = () => {
  const { tenant, refreshUser } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [legalName, setLegalName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // New branch form state
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');

  useEffect(() => {
    if (tenant) {
      setLegalName(tenant.name || '');
      setTradingName(tenant.trading_name || '');
      setKraPin(tenant.kra_pin || '');
    }
    fetchBranches();
  }, [tenant]);

  const fetchBranches = () => {
    apiRequest<any[]>('/tenants/branches')
      .then((data) => setBranches(data))
      .catch(() => {});
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiRequest('/tenants/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: legalName,
          trading_name: tradingName,
          kra_pin: kraPin,
        }),
      });
      await refreshUser();
      setSavedFeedback('Organization profile updated and audited.');
      setTimeout(() => setSavedFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update organization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/tenants/branches', {
        method: 'POST',
        body: JSON.stringify({
          name: branchName,
          code: branchCode,
          is_headquarters: false,
        }),
      });
      setBranchName('');
      setBranchCode('');
      fetchBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to create branch');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Business Organization Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure business legal profile, trading names, KRA PIN tax identity, and physical branch stations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
          <h2 className="text-base font-semibold text-white mb-4">Legal Business Profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Registered Legal Entity Name</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Trading Name (Brand Display)</label>
              <input
                type="text"
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">KRA PIN (11 Chars)</label>
                <input
                  type="text"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Base Currency</label>
                <input
                  type="text"
                  value="KES (Kenyan Shilling)"
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-slate-400 font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>

            {savedFeedback && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                {savedFeedback}
              </div>
            )}
          </form>
        </div>

        {/* Branch Stations */}
        <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48] flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-white mb-2">Branches & Stations</h2>
            <p className="text-xs text-slate-400 mb-4">Stations can be assigned specific cashiers and invoice number prefixes</p>

            <div className="space-y-2 mb-4">
              {branches.map((b) => (
                <div key={b.id} className="p-3 rounded-lg bg-[#0E1E35] border border-[#1E2E48] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-white font-sans">{b.name}</span>
                    <span className="text-slate-400">[{b.code}]</span>
                  </div>
                  {b.is_headquarters && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-sans">
                      Headquarters
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateBranch} className="pt-4 border-t border-[#1E2E48] space-y-3 text-xs">
            <div className="font-semibold text-slate-200">Add New Branch Station</div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Branch Name (e.g. Kisumu)"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="col-span-2 px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
                required
              />
              <input
                type="text"
                placeholder="Code (KSU)"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white font-mono uppercase"
                required
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 rounded-lg bg-[#11223A] hover:bg-emerald-500 hover:text-white border border-[#1E2E48] text-slate-300 font-medium transition flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Branch</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
