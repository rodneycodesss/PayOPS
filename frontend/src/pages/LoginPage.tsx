import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Key, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';

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
    <div className="min-h-screen flex flex-col lg:flex-row font-sans selection:bg-[#16A6D9] selection:text-slate-950">
      {/* Left Column (Midnight Dark - Page 3) */}
      <div className="lg:w-1/2 bg-[#080D18] text-white p-8 sm:p-16 flex flex-col justify-between min-h-[400px] lg:min-h-screen border-r border-slate-900">
        <Link to="/" className="inline-block">
          <Logo variant="full" size="md" />
        </Link>

        <div className="my-16 lg:my-0 space-y-6">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-white leading-none">
            Welcome<br />
            back<span className="text-[#16A6D9]">.</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-sm">
            Your payments, reconciliations and books are waiting.
          </p>
        </div>

        {/* Mini Cyan Bar Visual (Page 3) */}
        <div className="flex items-end space-x-2.5 h-16 pt-4">
          <div className="w-4 bg-[#16A6D9]/30 rounded-t h-6"></div>
          <div className="w-4 bg-[#16A6D9]/40 rounded-t h-10"></div>
          <div className="w-4 bg-[#16A6D9]/30 rounded-t h-5"></div>
          <div className="w-4 bg-[#16A6D9]/60 rounded-t h-12"></div>
          <div className="w-4 bg-[#16A6D9]/70 rounded-t h-14"></div>
          <div className="w-4 bg-[#16A6D9] rounded-t h-16"></div>
          <div className="w-4 bg-[#16A6D9] rounded-t h-16"></div>
        </div>
      </div>

      {/* Right Column (White Form - Page 3) */}
      <div className="lg:w-1/2 bg-white text-slate-900 p-8 sm:p-16 lg:p-24 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold text-slate-950 tracking-tight">
              Log in
            </h2>
          </div>

          {/* Public Test Account Pre-filled notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2 text-xs text-slate-700">
            <ShieldCheck className="w-4 h-4 text-[#16A6D9] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">Public Test Account Pre-filled:</span>
              <div className="font-mono text-[11px] text-slate-600 mt-0.5">
                rodney@rodstartechdevs.co.ke / SecureRodstar2026!
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!mfaRequired ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Work email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.co.ke"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] focus:ring-2 focus:ring-[#16A6D9]/20 transition text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] focus:ring-2 focus:ring-[#16A6D9]/20 transition text-slate-900"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Enter 6-Digit TOTP Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-3 rounded-xl border border-[#16A6D9] focus:outline-none focus:ring-2 focus:ring-[#16A6D9]/20 text-center font-mono text-xl tracking-widest text-slate-900"
                />
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Two-factor code asked next</span>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact system administrator to reset password.'); }} className="text-[#16A6D9] hover:underline font-medium">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-base transition shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? 'Authenticating...' : mfaRequired ? 'Verify code' : 'Log in'}
            </button>

            <div className="pt-2 text-sm text-slate-500">
              New business?{' '}
              <Link to="/early-access" className="text-[#16A6D9] font-semibold hover:underline">
                Join early access
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
