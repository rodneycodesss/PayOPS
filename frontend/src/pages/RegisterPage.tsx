import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, User, Phone, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';

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
        kra_pin: kraPin ? kraPin.toUpperCase() : undefined,
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
    <div className="min-h-screen flex flex-col lg:flex-row font-sans selection:bg-[#16A6D9] selection:text-slate-950">
      {/* Left Column (Midnight Dark) */}
      <div className="lg:w-1/2 bg-[#080D18] text-white p-8 sm:p-16 flex flex-col justify-between min-h-[400px] lg:min-h-screen border-r border-slate-900">
        <Link to="/" className="inline-block">
          <Logo variant="full" size="md" />
        </Link>

        <div className="my-16 lg:my-0 space-y-6">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-white leading-none">
            Get<br />
            started<span className="text-[#16A6D9]">.</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-sm">
            Onboard your business organization, configure M-PESA & bank rails, and provision your Chart of Accounts.
          </p>
        </div>

        {/* Visual Accent */}
        <div className="flex items-end space-x-2.5 h-16 pt-4">
          <div className="w-4 bg-[#16A6D9]/30 rounded-t h-6"></div>
          <div className="w-4 bg-[#16A6D9]/50 rounded-t h-10"></div>
          <div className="w-4 bg-[#16A6D9]/70 rounded-t h-14"></div>
          <div className="w-4 bg-[#16A6D9] rounded-t h-16"></div>
        </div>
      </div>

      {/* Right Column (White Form) */}
      <div className="lg:w-1/2 bg-white text-slate-900 p-8 sm:p-16 lg:p-20 flex flex-col justify-center overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">
              Create business account
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Multi-tenant isolation guaranteed. Your ledger and data remain strictly private.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Business Legal Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Acme Commercials Ltd"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Trading Name
                </label>
                <input
                  type="text"
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  placeholder="Acme Freight"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  KRA PIN
                </label>
                <input
                  type="text"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                  placeholder="P051234567A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Your Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Wanjiku"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@acme.co.ke"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 711 000 111"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-sm transition shadow-xl disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Provisioning Tenant...' : 'Create Account & Open Dashboard'}
            </button>

            <div className="pt-2 text-xs text-slate-500 text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-[#16A6D9] font-semibold hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
