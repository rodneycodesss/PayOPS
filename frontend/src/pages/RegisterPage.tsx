import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, User, Phone, ArrowRight, AlertCircle, ShieldCheck, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';

export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [businessName, setBusinessName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // OTP Verification State
  const [otpCode, setOtpCode] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { requestRegisterOtp, resendRegisterOtp, verifyRegisterOtp } = useAuth();
  const navigate = useNavigate();

  // Expiration countdown
  useEffect(() => {
    if (step !== 'otp' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const cd = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(cd);
  }, [resendCooldown]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const res = await requestRegisterOtp({
        business_name: businessName,
        trading_name: tradingName || undefined,
        kra_pin: kraPin ? kraPin.toUpperCase() : undefined,
        full_name: fullName,
        email,
        password,
        phone: phone || undefined,
      });

      if (res?.dev_otp) {
        setDevOtp(res.dev_otp);
      }
      setTimeLeft(res?.expires_in || 600);
      setResendCooldown(30);
      setStep('otp');
      setInfoMessage(`A 6-digit verification code has been sent to ${email}`);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await verifyRegisterOtp(email, otpCode);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await resendRegisterOtp(email);
      if (res?.dev_otp) {
        setDevOtp(res.dev_otp);
      }
      setTimeLeft(res?.expires_in || 600);
      setResendCooldown(30);
      setInfoMessage(`New verification code sent to ${email}`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
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
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#16A6D9]/10 border border-[#16A6D9]/30 text-[#16A6D9] text-xs font-semibold">
            <span>Enterprise Multi-Tenant SaaS</span>
          </div>
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

      {/* Right Column */}
      <div className="lg:w-1/2 bg-white text-slate-900 p-8 sm:p-16 lg:p-20 flex flex-col justify-center overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-6">
          {step === 'form' ? (
            <>
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

              <form onSubmit={handleInitialSubmit} className="space-y-4 text-xs font-sans">
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
                  className="w-full py-3.5 px-6 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-sm transition shadow-xl disabled:opacity-50 mt-2 flex items-center justify-center space-x-2"
                >
                  <span>{isSubmitting ? 'Sending OTP Code...' : 'Continue to Verification'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-2 text-xs text-slate-500 text-center">
                  Already have an account?{' '}
                  <Link to="/login" className="text-[#16A6D9] font-semibold hover:underline">
                    Log in
                  </Link>
                </div>
              </form>
            </>
          ) : (
            /* Step 2: 6-Digit OTP Verification Screen */
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit registration details</span>
              </button>

              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#16A6D9]/10 text-[#16A6D9] flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">
                  Verify your email
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  We've sent a 6-digit confirmation code to{' '}
                  <span className="font-semibold text-slate-900">{email}</span>.
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
                    onClick={() => setOtpCode(devOtp)}
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
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      6-Digit Code
                    </label>
                    <span className="text-xs font-mono text-slate-500">
                      Expires in: <strong className="text-slate-800">{formatTimer(timeLeft)}</strong>
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] focus:ring-4 focus:ring-[#16A6D9]/15 text-center text-3xl font-mono tracking-[0.5em] text-slate-950 font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6 || timeLeft === 0}
                  className="w-full py-4 px-6 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-sm transition shadow-xl disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>{isSubmitting ? 'Verifying & Provisioning...' : 'Verify & Open Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
                  <span>Didn't receive code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isSubmitting}
                    onClick={handleResendOtp}
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
