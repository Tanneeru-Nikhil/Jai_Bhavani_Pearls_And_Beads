import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, AlertTriangle, Package, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { ProductVariant, PaginatedResponse, Product } from '@/types';

interface LowStockVariant extends ProductVariant {
  product_name: string;
  product_id: string;
}

interface AdjustPayload {
  variant_id: string;
  quantity_change: number;
  reason: string;
}

export default function AdminInventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjForm, setAdjForm] = useState({ quantity_change: 0, reason: '' });

  const { data, isLoading } = useQuery<{ items: LowStockVariant[]; total: number }>({
    queryKey: ['admin-inventory', search, lowStockOnly],
    queryFn: async () => {
      const { data } = await api.get('/admin/inventory', {
        params: { q: search || undefined, low_stock: lowStockOnly || undefined },
      });
      return data;
    },
  });

  const adjustMutation = useMutation({
    mutationFn: (payload: AdjustPayload) => api.post('/admin/inventory/adjust', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      toast.success('Inventory adjusted');
      setAdjusting(null);
      setAdjForm({ quantity_change: 0, reason: '' });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-midnight-navy">Inventory</h1>
        {data && (
          <span className="text-sm text-gray-500">{data.total} variants</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="inventory-search"
            className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/50 w-52"
            placeholder="Search SKU, product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
          <input
            id="low-stock-toggle"
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded border-gray-300 text-champagne-gold focus:ring-champagne-gold"
          />
          <AlertTriangle size={14} className="text-amber-500" />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product / SKU</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Variant</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Price</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td className="px-5 py-4" colSpan={5}><div className="skeleton h-4 rounded w-3/4" /></td>
                    </tr>
                  ))
                : data?.items.map((v, i) => (
                    <React.Fragment key={v.id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className={`hover:bg-gray-50/60 transition-colors ${v.available_quantity <= 5 ? 'bg-red-50/30' : ''}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-midnight-navy">{v.product_name}</div>
                          <div className="text-xs text-gray-400">{v.sku}</div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">
                          {[v.color, v.size_mm && `${v.size_mm}mm`, v.finish].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className={`font-semibold ${v.available_quantity <= 0 ? 'text-red-600' : v.available_quantity <= 5 ? 'text-amber-600' : 'text-green-700'}`}>
                            {v.available_quantity}
                          </div>
                          <div className="text-xs text-gray-400">{v.reserved_quantity} reserved</div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell text-midnight-navy font-medium">
                          {formatCurrency(v.price, v.currency)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            id={`adjust-${v.id}`}
                            onClick={() => {
                              setAdjusting(adjusting === v.id ? null : v.id);
                              setAdjForm({ quantity_change: 0, reason: '' });
                            }}
                            className="text-xs text-champagne-gold hover:underline font-medium"
                          >
                            {adjusting === v.id ? 'Cancel' : 'Adjust'}
                          </button>
                        </td>
                      </motion.tr>
                      {adjusting === v.id && (
                        <tr>
                          <td colSpan={5} className="px-5 py-4 bg-amber-50/30">
                            <div className="flex flex-wrap items-end gap-3 text-sm">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Change (+ or −)</label>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setAdjForm((f) => ({ ...f, quantity_change: f.quantity_change - 1 }))}
                                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-100"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <input
                                    id={`adj-qty-${v.id}`}
                                    type="number"
                                    className="input-field w-20 text-center py-1.5"
                                    value={adjForm.quantity_change}
                                    onChange={(e) => setAdjForm((f) => ({ ...f, quantity_change: parseInt(e.target.value) || 0 }))}
                                  />
                                  <button
                                    onClick={() => setAdjForm((f) => ({ ...f, quantity_change: f.quantity_change + 1 }))}
                                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-100"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              </div>
                              <div className="flex-1 min-w-40">
                                <label className="block text-xs text-gray-500 mb-1">Reason</label>
                                <input
                                  id={`adj-reason-${v.id}`}
                                  className="input-field py-1.5 text-sm"
                                  value={adjForm.reason}
                                  onChange={(e) => setAdjForm((f) => ({ ...f, reason: e.target.value }))}
                                  placeholder="Restock, correction…"
                                />
                              </div>
                              <button
                                id={`adj-save-${v.id}`}
                                disabled={adjForm.quantity_change === 0 || adjustMutation.isPending}
                                onClick={() =>
                                  adjustMutation.mutate({
                                    variant_id: v.id,
                                    ...adjForm,
                                  })
                                }
                                className="btn-primary py-1.5 px-4 text-xs"
                              >
                                {adjustMutation.isPending ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
