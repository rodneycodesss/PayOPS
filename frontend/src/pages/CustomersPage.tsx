import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Phone,
  Mail,
  Building,
  CreditCard,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { apiRequest } from '../services/api';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  kra_pin?: string;
  address?: string;
  credit_balance: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Customer Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [address, setAddress] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadCustomers = async (searchQuery = '') => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = searchQuery
        ? `/customers/?search=${encodeURIComponent(searchQuery)}`
        : '/customers/';
      const data = await apiRequest<Customer[]>(endpoint);
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(search);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/customers/', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          kra_pin: kraPin.trim() || undefined,
          address: address.trim() || undefined,
          currency: 'KES',
        }),
      });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setKraPin('');
      setAddress('');
      showToast('Customer created successfully');
      loadCustomers(search);
    } catch (err: any) {
      alert(`Failed to create customer: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Customer Directory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage customer accounts, tax identification (KRA PIN), and credit balances derived from overpayments.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex items-center space-x-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company name, email, or KRA PIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0B192C] border border-[#1E2E48] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-[#11223A] border border-[#1E2E48] text-slate-200 text-xs font-medium hover:text-white transition"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              loadCustomers('');
            }}
            className="text-xs text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading customer directory...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-400 text-xs flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p>No customers found. Click "New Customer" above to add your first customer account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left font-mono">
              <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Company / Client Name</th>
                  <th className="py-2.5 px-3">KRA PIN</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3 text-right">Overpayment Credit</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2E48]/50">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#11223A]/30 transition">
                    <td className="py-2.5 px-3 font-semibold text-white font-sans">{c.name}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">
                      {c.kra_pin || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">{c.email || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-400">{c.phone || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-300">
                      KES {parseFloat(c.credit_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Create Customer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E2E48] rounded-2xl shadow-2xl p-6 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2E48]">
              <div>
                <h3 className="text-base font-bold text-white">Add New Customer</h3>
                <p className="text-slate-400 mt-0.5">
                  Register corporate or SME client for invoicing & eTIMS.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 mt-4">
              <div>
                <label className="block text-slate-400 mb-1">Company / Entity Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Safari Holdings Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">KRA PIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. P051234567A"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="finance@company.co.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+254711223344"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Physical Address / Location</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Upperhill, Nairobi"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E1E35] border border-[#1E2E48] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition"
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
