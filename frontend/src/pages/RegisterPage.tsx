import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

export const RegisterPage: React.FC = () => {
  const [businessName, setBusinessName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        business_name: businessName,
        trading_name: tradingName || undefined,
        kra_pin: kraPin || undefined,
        full_name: fullName,
        email,
        password,
        phone: phone || undefined,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Onboard Tenant Organization</h2>
        <p className="mt-2 text-xs text-slate-400">
          Provisions your business organization, default HQ station, and Kenyan SME Chart of Accounts.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-[#0B192C] py-8 px-6 shadow-2xl rounded-2xl border border-[#1E2E48]">
          <form className="space-y-4 text-xs" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                Business Legal Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                placeholder="Apex Commercials Ltd"
                className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                  Trading Name
                </label>
                <input
                  type="text"
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  placeholder="Apex Freight"
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                  KRA PIN
                </label>
                <input
                  type="text"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value)}
                  placeholder="P051234567Z"
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white uppercase font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                Primary Owner Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Jane Wanjiku"
                className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                Owner Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="jane@apex.co.ke"
                className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold uppercase tracking-wider mb-1">
                Password * (min 8 chars)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50 mt-4"
            >
              <span>{isSubmitting ? 'Registering...' : 'Complete Onboarding'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center text-slate-400">
              Already registered?{' '}
              <Link to="/login" className="text-emerald-400 hover:underline font-medium">
                Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
