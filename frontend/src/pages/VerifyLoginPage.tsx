import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';

export const VerifyLoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { verifyEmailLink } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No authentication token was found in this link. Please request a new sign-in link.');
      return;
    }

    let isMounted = true;

    const performVerification = async () => {
      try {
        await verifyEmailLink(token);
        if (isMounted) {
          setStatus('success');
          // Smooth redirect after brief confirmation
          setTimeout(() => {
            navigate('/');
          }, 1200);
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'This verification link is invalid, expired, or has already been used.');
        }
      }
    };

    performVerification();

    return () => {
      isMounted = false;
    };
  }, [token, verifyEmailLink, navigate]);

  return (
    <div className="min-h-screen bg-[#080D18] flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-[#16A6D9] selection:text-slate-950">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="flex justify-center">
          <Link to="/">
            <Logo variant="full" size="md" />
          </Link>
        </div>

        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="py-8 space-y-5">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#16A6D9]/20 animate-ping"></div>
              <div className="w-16 h-16 rounded-full bg-[#16A6D9]/10 border-2 border-[#16A6D9] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#16A6D9] animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Verifying Sign-In Link
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Authenticating your single-use cryptographic token and establishing your secure session...
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="py-8 space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Authentication Approved!
              </h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Your identity was successfully verified. Redirecting you to the Rodstar PayOps dashboard...
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center space-x-2 text-xs font-bold text-[#16A6D9] hover:underline"
              >
                <span>Click here if not redirected automatically</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="py-6 space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 text-red-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Link Expired or Invalid
              </h2>
              <p className="text-xs text-red-200 bg-red-950/40 border border-red-900/50 p-3.5 rounded-xl leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Link
                to="/login"
                className="w-full py-3.5 px-6 rounded-xl bg-[#16A6D9] hover:bg-[#1495c3] text-slate-950 font-bold text-sm transition shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Back to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="text-xs text-slate-500 flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16A6D9]" />
                <span>Single-use tokens expire after 15 minutes</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
