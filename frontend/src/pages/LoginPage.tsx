import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Key, ShieldCheck, AlertCircle, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, Sparkles, Send } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';

export const LoginPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'password' | 'magic_link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, verifyLogin2fa, resendLogin2fa, requestMagicLink } = useAuth();
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
          if (res.dev_link) {
            setDevLink(res.dev_link);
          }
          setResendCooldown(30);
          setInfoMessage(`A 6-digit code and a one-click verification link were sent to ${email}.`);
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

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your work email.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const res = await requestMagicLink(email);
      setMagicLinkSent(true);
      if (res.dev_link) {
        setDevLink(res.dev_link);
      }
      setResendCooldown(30);
      setInfoMessage(`A secure sign-in link has been sent to ${email}. Check your inbox!`);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch email sign-in link.');
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
      if (res?.dev_link) {
        setDevLink(res.dev_link);
      }
      setResendCooldown(30);
      setInfoMessage(`New 2FA verification code and email link sent to ${email}`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend 2FA verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToCredentials = () => {
    setMfaRequired(false);
    setTempToken(null);
    setDevOtp(null);
    setDevLink(null);
    setTotpCode('');
    setError(null);
    setInfoMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans selection:bg-[#16A6D9] selection:text-slate-950">
      {/* Left Column (Midnight Dark) */}
      <div className="lg:w-1/2 bg-[#080D18] text-white p-8 sm:p-16 flex flex-col justify-between min-h-[400px] lg:min-h-screen border-r border-slate-900">
        <Link to="/" className="inline-block">
          <Logo variant="full" size="md" />
        </Link>

        <div className="my-16 lg:my-0 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#16A6D9]/10 border border-[#16A6D9]/30 text-[#16A6D9] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Email Link & 2FA Protected Sign-in</span>
          </div>
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-white leading-none">
            Welcome<br />
            back<span className="text-[#16A6D9]">.</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-sm">
            Your payments, reconciliations and books are waiting.
          </p>
        </div>

        {/* Mini Cyan Bar Visual */}
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

      {/* Right Column (White Form) */}
      <div className="lg:w-1/2 bg-white text-slate-900 p-8 sm:p-16 lg:p-24 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto space-y-6">
          {!mfaRequired ? (
            <>
              <div>
                <h2 className="text-4xl font-extrabold text-slate-950 tracking-tight">
                  Log in
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose your preferred authentication method.
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('password');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition ${
                    authMode === 'password'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Password & 2FA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('magic_link');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition ${
                    authMode === 'magic_link'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Email Sign-In Link
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {infoMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {authMode === 'password' ? (
                /* Password & 2FA Form */
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
                        setAuthMode('magic_link');
                        setInfoMessage('You can sign in directly using an email link below without entering your password.');
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
                    <span>{isSubmitting ? 'Authenticating...' : 'Log in with Password'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-sm text-slate-500 text-center">
                    New business?{' '}
                    <Link to="/register" className="text-[#16A6D9] font-semibold hover:underline">
                      Register with OTP
                    </Link>
                  </div>
                </form>
              ) : (
                /* Email Link (Passwordless) Form */
                <form onSubmit={handleSendMagicLink} className="space-y-5">
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
                    <p className="text-xs text-slate-500 mt-1">
                      We'll send a single-use verification link to your inbox. No password needed.
                    </p>
                  </div>

                  {/* Dev Mode Instant Verification Helper */}
                  {devLink && (
                    <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-[#16A6D9] shrink-0" />
                        <div>
                          <span className="font-semibold">Dev Sign-In Link:</span>
                          <div className="text-[11px] text-cyan-700">Click to authenticate immediately</div>
                        </div>
                      </div>
                      <Link
                        to={devLink.replace(/^https?:\/\/[^/]+/, '')}
                        className="px-3 py-1 rounded bg-[#080D18] hover:bg-slate-900 text-white font-bold text-xs shadow-sm flex items-center space-x-1"
                      >
                        <span>Open Link</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-base transition shadow-xl disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Dispatching link...' : 'Send Sign-In Link'}</span>
                  </button>

                  <div className="pt-2 text-sm text-slate-500 text-center">
                    Prefer password?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('password')}
                      className="text-[#16A6D9] font-semibold hover:underline"
                    >
                      Log in with Password
                    </button>
                  </div>
                </form>
              )}
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
                  Enter the 6-digit code or click the verification link sent to{' '}
                  <span className="font-semibold text-slate-900">{email}</span>.
                </p>
              </div>

              {/* Dev Mode Helper Pill for 6-digit OTP */}
              {devOtp && (
                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Dev 2FA Code:</span>
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

              {/* Dev Mode Helper Pill for Email Verification Link */}
              {devLink && (
                <div className="p-3 rounded-xl bg-slate-900 text-white border border-slate-800 text-xs flex items-center justify-between shadow-md">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#16A6D9]" />
                    <span className="font-semibold">Email Link 2FA:</span>
                    <span className="text-slate-300 hidden sm:inline">1-Click Approve</span>
                  </div>
                  <Link
                    to={devLink.replace(/^https?:\/\/[^/]+/, '')}
                    className="px-3 py-1 rounded bg-[#16A6D9] hover:bg-[#1495c3] text-slate-950 font-bold text-xs flex items-center space-x-1"
                  >
                    <span>Approve via Link</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
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
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code & link'}
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
