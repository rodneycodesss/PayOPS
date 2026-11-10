import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

interface ProductItem {
  id: string;
  name: string;
  price: string;
  taxType: 'Standard VAT 16%' | 'Zero-rated' | 'Exempt';
}

export const ProductsPage: React.FC = () => {
  const { isTestAccount } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Baseline illustrative products exactly from Page 13
  const [items, setItems] = useState<ProductItem[]>([
    {
      id: 'prod-1',
      name: 'Service A',
      price: '10,000',
      taxType: 'Standard VAT 16%',
    },
    {
      id: 'prod-2',
      name: 'Product B',
      price: '2,500',
      taxType: 'Standard VAT 16%',
    },
    {
      id: 'prod-3',
      name: 'Item C',
      price: '1,200',
      taxType: 'Zero-rated',
    },
    {
      id: 'prod-4',
      name: 'Item D',
      price: '800',
      taxType: 'Exempt',
    },
  ]);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [taxType, setTaxType] = useState<ProductItem['taxType']>('Standard VAT 16%');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: ProductItem = {
      id: `prod-${Date.now()}`,
      name,
      price: Number(price).toLocaleString(),
      taxType,
    };
    setItems([newItem, ...items]);
    setIsModalOpen(false);
    setName('');
    setPrice('');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Header Row (Page 13) */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Products and Services
        </h1>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 rounded-xl bg-[#16A6D9] hover:bg-[#1392C0] text-slate-950 font-bold text-sm transition shadow-md shadow-[#16A6D9]/20 flex items-center space-x-2"
        >
          <span>Add item</span>
        </button>
      </div>

      {/* Grid of Product Cards (Page 13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between space-y-6 hover:border-slate-300 transition"
          >
            <div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  item.taxType === 'Standard VAT 16%'
                    ? 'bg-[#EBF7FD] text-[#0284C7]'
                    : item.taxType === 'Zero-rated'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {item.taxType}
              </span>
              <h2 className="text-2xl font-bold text-slate-950 mt-4">{item.name}</h2>
            </div>

            <div className="text-3xl font-extrabold text-slate-950 font-sans">
              KSh {item.price}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Illustrative Data Tag (Page 13) */}
      {isTestAccount && (
        <div className="pt-2">
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
            Illustrative data
          </span>
        </div>
      )}

      {/* Modal: Add Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-950">Add Product or Service</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Item Title / Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Consultation Fee"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Price (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="10000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">KRA VAT Classification</label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#16A6D9] text-sm text-slate-900"
                >
                  <option value="Standard VAT 16%">Standard VAT 16%</option>
                  <option value="Zero-rated">Zero-rated</option>
                  <option value="Exempt">Exempt</option>
                </select>
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
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
