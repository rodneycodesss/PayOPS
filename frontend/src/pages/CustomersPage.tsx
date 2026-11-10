import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { apiRequest } from '../services/api';

interface CustomerItem {
  id: string;
  name: string;
  kraPin: string;
  email: string;
  phone: string;
  credit: string;
  status: string;
}

export const CustomersPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [search, setSearch] = useState('');

  // Baseline illustrative items for test account when empty
  const illustrativeCustomers: CustomerItem[] = [
    {
      id: 'c-1',
      name: 'Customer A (Acme Kenya Ltd)',
      kraPin: 'P051982736Z',
      email: 'finance@acmekenya.co.ke',
      phone: '+254711223344',
      credit: '12,500.00',
      status: 'Active',
    },
    {
      id: 'c-2',
      name: 'Customer B (Kilifi Wholesale)',
      kraPin: 'P052847192A',
      email: 'accounts@kilifiwholesale.com',
      phone: '+254722334455',
      credit: '0.00',
      status: 'Active',
    },
    {
      id: 'c-3',
      name: 'Customer C (Safari Holdings Ltd)',
      kraPin: 'P059876543A',
      email: 'billing@safariholdings.co.ke',
      phone: '+254711002233',
      credit: '8,000.00',
      status: 'Active',
    },
    {
      id: 'c-4',
      name: 'Customer D (Nairobi Tech Ventures)',
      kraPin: 'P051234567A',
      email: 'finance@ntv.co.ke',
      phone: '+254799887766',
      credit: '3,200.00',
      status: 'Active',
    },
  ];

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const real = await apiRequest<any[]>('/customers/');
      if (real && real.length > 0) {
        setHasRealData(true);
        const mapped: CustomerItem[] = real.map((c) => ({
          id: c.id,
          name: c.name,
          kraPin: c.kra_pin || '—',
          email: c.email || '—',
          phone: c.phone || '—',
          credit: Number(c.credit_balance || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
          status: c.is_active ? 'Active' : 'Inactive',
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
    setIsSubmitting(true);
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
      setEmail('');
      setPhone('');
      setKraPin('');
    } catch (err: any) {
      alert(`Customer creation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.kraPin.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const showIllustrativeBadge = isTestAccount && !hasRealData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Customer accounts, KRA PIN tax registry, and overpayment balances.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {showIllustrativeBadge && (
            <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
              Illustrative data
            </span>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold text-sm transition shadow-md shadow-[#16A6D9]/20 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New customer</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search by company name, email, or KRA PIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#16A6D9] shadow-sm"
        />
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                <th className="pb-4 font-normal">Company / Entity</th>
                <th className="pb-4 font-normal">KRA PIN</th>
                <th className="pb-4 font-normal">Email</th>
                <th className="pb-4 font-normal">Phone</th>
                <th className="pb-4 font-normal text-right">Overpayment Credit</th>
                <th className="pb-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    {customers.length === 0 ? (
                      <div className="space-y-2">
                        <p>No customers in your directory yet.</p>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="text-[#16A6D9] font-bold hover:underline"
                        >
                          Add your first customer
                        </button>
                      </div>
                    ) : (
                      'No customers found matching your search.'
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-4 font-mono text-xs text-slate-600">{c.kraPin}</td>
                    <td className="py-4 text-slate-600 text-xs">{c.email}</td>
                    <td className="py-4 text-slate-600 font-mono text-xs">{c.phone}</td>
                    <td className="py-4 text-right font-mono font-bold text-emerald-600">
                      KES {c.credit}
                    </td>
                    <td className="py-4">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        {c.status}
                      </span>
                    </td>
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
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900"
              >
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
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold transition"
                >
                  {isSubmitting ? 'Creating...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
