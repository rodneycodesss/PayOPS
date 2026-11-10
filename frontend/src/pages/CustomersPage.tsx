import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface CustomerRow {
  id: string;
  customer: string;
  kraPin: string;
  outstanding: string;
  lastPayment: string;
}

export const CustomersPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [hasRealData, setHasRealData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Customer form
  const [name, setName] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Page 12 exact illustrative baseline
  const illustrativeCustomers: CustomerRow[] = [
    {
      id: 'c-1',
      customer: 'Customer A',
      kraPin: 'A••••••••X',
      outstanding: 'KSh 11,600',
      lastPayment: 'Today',
    },
    {
      id: 'c-2',
      customer: 'Customer B',
      kraPin: 'A••••••••Y',
      outstanding: 'KSh 29,000',
      lastPayment: '3 days ago',
    },
    {
      id: 'c-3',
      customer: 'Customer C',
      kraPin: 'Not provided',
      outstanding: 'KSh 0',
      lastPayment: 'Last week',
    },
    {
      id: 'c-4',
      customer: 'Customer D',
      kraPin: 'P••••••••Z',
      outstanding: 'KSh 12,000',
      lastPayment: '2 weeks ago',
    },
  ];

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const real = await apiRequest<any[]>('/customers/');
      if (real && real.length > 0) {
        setHasRealData(true);
        const mapped: CustomerRow[] = real.map((c) => ({
          id: c.id,
          customer: c.name,
          kraPin: c.kra_pin
            ? `${c.kra_pin.slice(0, 1)}••••••••${c.kra_pin.slice(-1)}`
            : 'Not provided',
          outstanding: `KSh ${Number(c.credit_balance || 0).toLocaleString()}`,
          lastPayment: 'Recently',
        }));
        setCustomers(mapped);
      } else {
        setHasRealData(false);
        if (isTestAccount) {
          setCustomers(illustrativeCustomers);
        } else {
          setCustomers([]);
        }
      }
    } catch {
      setHasRealData(false);
      if (isTestAccount) {
        setCustomers(illustrativeCustomers);
      } else {
        setCustomers([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [isTestAccount]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/customers/', {
        method: 'POST',
        body: JSON.stringify({
          name,
          kra_pin: kraPin ? kraPin.toUpperCase() : undefined,
          email: email || undefined,
          phone: phone || undefined,
        }),
      });
      await fetchCustomers();
      setIsModalOpen(false);
      setName('');
      setKraPin('');
      setEmail('');
      setPhone('');
    } catch (err: any) {
      alert(`Customer creation failed: ${err.message}`);
    }
  };

  const showIllustrativeBadge = isTestAccount && !hasRealData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Row (Page 12) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Customers
        </h1>

        <div className="flex items-center space-x-3">
          {showIllustrativeBadge && (
            <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
              Illustrative data
            </span>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold text-xs transition shadow-md shadow-[#16A6D9]/20 flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add customer</span>
          </button>
        </div>
      </div>

      {/* Table Card (Page 12) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">Customer</th>
                <th className="pb-4 font-normal">KRA PIN</th>
                <th className="pb-4 font-normal">Outstanding</th>
                <th className="pb-4 font-normal">Last payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                    No customers registered yet. Click 'Add customer' to begin.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 font-bold text-slate-900">{c.customer}</td>
                    <td className="py-4 font-mono text-xs text-slate-600">{c.kraPin}</td>
                    <td className="py-4 font-bold text-slate-900 font-sans">{c.outstanding}</td>
                    <td className="py-4 text-slate-600 text-xs">{c.lastPayment}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Customer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-950">Add Customer</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company / Entity Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Kenya Ltd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">KRA PIN</label>
                <input
                  type="text"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                  placeholder="P051234567A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="finance@acmekenya.co.ke"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 711 223 344"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold transition"
                >
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
