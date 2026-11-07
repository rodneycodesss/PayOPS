import React, { useState } from 'react';
import { Users, Plus, Phone, Mail, Building, CreditCard } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers] = useState([
    {
      id: 'cust-1',
      name: 'Acme Kenya Limited',
      email: 'finance@acmekenya.co.ke',
      phone: '+254711223344',
      kra_pin: 'P051982736Z',
      credit_balance: '12,500.00',
      status: 'Active'
    },
    {
      id: 'cust-2',
      name: 'Kilifi Wholesale Enterprises',
      email: 'accounts@kilifiwholesale.com',
      phone: '+254722334455',
      kra_pin: 'P052847192A',
      credit_balance: '0.00',
      status: 'Active'
    },
    {
      id: 'cust-3',
      name: 'Nairobi Heights Medical Supplies',
      email: 'billing@nairobiheights.org',
      phone: '+254733445566',
      kra_pin: 'P053918274B',
      credit_balance: '3,200.00',
      status: 'Active'
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Customer Directory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage customer accounts, tax identification (KRA PIN), and credit balances derived from overpayments.
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4 mr-2" />
          <span>New Customer</span>
        </button>
      </div>

      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left font-mono">
            <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Company Name</th>
                <th className="py-2.5 px-3">KRA PIN</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Overpayment Credit</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E48]/50">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#11223A]/30 transition">
                  <td className="py-2.5 px-3 font-semibold text-white font-sans">{c.name}</td>
                  <td className="py-2.5 px-3 text-emerald-400">{c.kra_pin}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">{c.email}</td>
                  <td className="py-2.5 px-3 text-slate-400">{c.phone}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">KES {c.credit_balance}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
