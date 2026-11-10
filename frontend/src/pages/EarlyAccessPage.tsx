import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { CheckCircle2 } from 'lucide-react';

export const EarlyAccessPage: React.FC = () => {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans selection:bg-[#16A6D9] selection:text-slate-950">
      {/* Left Column (Cyan Hero - Page 7) */}
      <div className="lg:w-1/2 bg-[#16A6D9] text-slate-950 p-8 sm:p-16 flex flex-col justify-between min-h-[400px] lg:min-h-screen">
        <Link to="/" className="inline-block">
          <Logo variant="full" size="md" theme="light" />
        </Link>

        <div className="my-16 lg:my-0 space-y-4">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-slate-950 leading-none">
            Be first<br />
            in line.
          </h1>
        </div>

        <p className="text-base sm:text-lg font-medium text-slate-900/80 max-w-md">
          Early-access businesses help shape PayOps and get priority onboarding.
        </p>
      </div>

      {/* Right Column (White Form - Page 7) */}
      <div className="lg:w-1/2 bg-white text-slate-900 p-8 sm:p-16 lg:p-24 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">
              Request early access
            </h2>
          </div>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 animate-in fade-in">
              <div className="flex items-center space-x-2 font-bold text-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span>You're on the priority list!</span>
              </div>
              <p className="text-sm text-emerald-800">
                Thank you, <b>{businessName}</b>. Our developer operations team will reach out to <b>{email}</b> with onboarding access shortly.
              </p>
              <div className="pt-2">
                <Link
                  to="/"
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 underline"
                >
                  Return to homepage
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Business name
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Kenya Ltd"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] focus:ring-2 focus:ring-[#16A6D9]/20 transition text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Work email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rodney@business.co.ke"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] focus:ring-2 focus:ring-[#16A6D9]/20 transition text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 700 000 000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] focus:ring-2 focus:ring-[#16A6D9]/20 transition text-slate-900 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 px-6 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-base transition shadow-xl"
              >
                Request early access
              </button>

              <div className="pt-2 text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="text-[#16A6D9] font-semibold hover:underline">
                  Log in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
