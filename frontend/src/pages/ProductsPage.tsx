import React, { useState } from 'react';
import { Package, Plus, Tag } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products] = useState([
    {
      id: 'prod-1',
      name: 'Cloud Operations Advisory (Monthly)',
      sku: 'SRV-OPS-01',
      price: '85,000.00',
      tax_category: 'STANDARD (16%)',
      status: 'Active'
    },
    {
      id: 'prod-2',
      name: 'Cross-Border Freight Logistics',
      sku: 'LOG-FREIGHT-02',
      price: '140,000.00',
      tax_category: 'STANDARD (16%)',
      status: 'Active'
    },
    {
      id: 'prod-3',
      name: 'Export Clearance Services',
      sku: 'SRV-EXP-03',
      price: '35,000.00',
      tax_category: 'ZERO_RATED (0%)',
      status: 'Active'
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Products & Services Catalog</h1>
          <p className="text-sm text-slate-400 mt-1">
            Maintain itemized SKUs, base unit prices, and Kenyan VAT tax categories (Standard 16%, Zero-Rated, Exempt).
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4 mr-2" />
          <span>New Product / SKU</span>
        </button>
      </div>

      <div className="p-6 rounded-xl bg-[#0B192C] border border-[#1E2E48]">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left font-mono">
            <thead className="bg-[#0E1E35] text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Item / Service Name</th>
                <th className="py-2.5 px-3">Base Unit Price</th>
                <th className="py-2.5 px-3">Tax Treatment</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E48]/50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[#11223A]/30 transition">
                  <td className="py-2.5 px-3 font-semibold text-emerald-400">{p.sku}</td>
                  <td className="py-2.5 px-3 font-sans text-white">{p.name}</td>
                  <td className="py-2.5 px-3 text-white font-bold">KES {p.price}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">
                      {p.tax_category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                      {p.status}
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
