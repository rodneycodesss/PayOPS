import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Key, ShieldCheck, AlertCircle, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('rodney@rodstartechdevs.co.ke');
  const [password, setPassword] = useState('SecureRodstar2026!');
  const [totpCode, setTotpCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, verifyLogin2fa, resendLogin2fa } = useAuth();
  const navigate = useNavigate();

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const cd = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(cd);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      if (!mfaRequired) {
        // Initial password authentication
        const res = await login(email, password);
        if (res?.mfa_required) {
          setMfaRequired(true);
          setTempToken(res.temp_token || null);
          if (res.dev_otp) {
            setDevOtp(res.dev_otp);
          }
          setResendCooldown(30);
          setInfoMessage(`A 6-digit 2FA code was sent to ${email} (or enter your Authenticator code).`);
        } else {
          navigate('/');
        }
      } else {
        // 2FA challenge verification
        if (!totpCode || totpCode.length !== 6) {
          setError('Please enter a valid 6-digit code.');
          return;
        }

        if (tempToken) {
          await verifyLogin2fa(tempToken, totpCode);
        } else {
          await login(email, password, totpCode);
        }
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend2faOtp = async () => {
    if (resendCooldown > 0 || isSubmitting || !tempToken) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await resendLogin2fa(tempToken);
      if (res?.dev_otp) {
        setDevOtp(res.dev_otp);
      }
      setResendCooldown(30);
      setInfoMessage(`New 2FA verification code sent to ${email}`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend 2FA code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToCredentials = () => {
    setMfaRequired(false);
    setTempToken(null);
    setDevOtp(null);
    setTotpCode('');
    setError(null);
    setInfoMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans selection:bg-[#16A6D9] selection:text-slate-950">
      {/* Left Column (Midnight Dark - Page 3) */}
      <div className="lg:w-1/2 bg-[#080D18] text-white p-8 sm:p-16 flex flex-col justify-between min-h-[400px] lg:min-h-screen border-r border-slate-900">
        <Link to="/" className="inline-block">
          <Logo variant="full" size="md" />
        </Link>

        <div className="my-16 lg:my-0 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#16A6D9]/10 border border-[#16A6D9]/30 text-[#16A6D9] text-xs font-semibold">
            <span>2FA Protected Sign-in</span>
          </div>
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
        <div className="max-w-md w-full mx-auto space-y-6">
          {!mfaRequired ? (
            <>
              <div>
                <h2 className="text-4xl font-extrabold text-slate-950 tracking-tight">
                  Log in
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Protected with multi-factor authentication (2FA).
                </p>
              </div>

              {/* Public Test Account Pre-filled notice */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2 text-xs text-slate-700">
                <ShieldCheck className="w-4 h-4 text-[#16A6D9] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">Public Test Account (2FA Active):</span>
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

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
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

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#16A6D9]" />
                    <span>2FA challenge prompted next</span>
                  </span>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Please contact system administrator to reset password.');
                    }}
                    className="text-[#16A6D9] hover:underline font-medium"
                  >
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-base transition shadow-xl disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Log in'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-2 text-sm text-slate-500 text-center">
                  New business?{' '}
                  <Link to="/register" className="text-[#16A6D9] font-semibold hover:underline">
                    Register with OTP
                  </Link>
                </div>
              </form>
            </>
          ) : (
            /* 2FA Challenge View */
            <div className="space-y-6">
              <button
                type="button"
                onClick={handleBackToCredentials}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to email & password</span>
              </button>

              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#16A6D9]/10 text-[#16A6D9] flex items-center justify-center mb-4">
                  <Key className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">
                  Two-factor authentication
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Enter the 6-digit verification code sent to{' '}
                  <span className="font-semibold text-slate-900">{email}</span> or your Authenticator app.
                </p>
              </div>

              {/* Dev Mode Helper Pill */}
              {devOtp && (
                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Dev/Test OTP:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-cyan-300 font-bold tracking-wider">
                      {devOtp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTotpCode(devOtp)}
                    className="text-[#16A6D9] hover:underline font-bold text-xs"
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              {infoMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    6-Digit Security Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] focus:ring-4 focus:ring-[#16A6D9]/15 text-center text-3xl font-mono tracking-[0.5em] text-slate-950 font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || totpCode.length !== 6}
                  className="w-full py-4 px-6 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-base transition shadow-xl disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>{isSubmitting ? 'Verifying 2FA...' : 'Verify Code & Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
                  <span>Didn't receive email code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isSubmitting}
                    onClick={handleResend2faOtp}
                    className="font-semibold text-[#16A6D9] hover:underline disabled:opacity-50 flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSubmitting ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
