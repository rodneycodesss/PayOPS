import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Key } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('rodney@rodstartechdevs.co.ke');
  const [password, setPassword] = useState('SecureRodstar2026!');
  const [totpCode, setTotpCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password, totpCode || undefined);
      if (res?.mfa_required) {
        setMfaRequired(true);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 items-center justify-center font-bold text-white shadow-xl shadow-emerald-500/20 text-xl mb-4">
          R
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">RODSTAR PAYOPS</h2>
        <p className="mt-2 text-xs text-slate-400">
          Intelligent Payment Operations & Double-Entry Financial SaaS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-[#0B192C] py-8 px-6 shadow-2xl rounded-2xl border border-[#1E2E48]">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                {error}
              </div>
            )}

            {!mfaRequired ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                      placeholder="finance@yourbusiness.co.ke"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                  Enter 6-Digit TOTP Authenticator Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0E1E35] border border-amber-500/50 text-white font-mono text-center tracking-widest text-lg"
                    placeholder="123456"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Authenticating...' : mfaRequired ? 'Verify TOTP' : 'Sign in to PayOps'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center text-xs text-slate-400">
              Need to onboard a new business?{' '}
              <Link to="/register" className="text-emerald-400 hover:underline font-medium">
                Register Tenant Organization
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
