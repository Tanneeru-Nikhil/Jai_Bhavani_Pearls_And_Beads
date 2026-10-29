import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, Package, IndianRupee, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { ProductListItem, PaginatedResponse } from '@/types';

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [priceModalProduct, setPriceModalProduct] = useState<ProductListItem | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');

  const { data, isLoading } = useQuery<PaginatedResponse<ProductListItem>>({
    queryKey: ['admin-products', search, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductListItem>>('/products', {
        params: { q: search || undefined, page, size: 20 },
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) =>
      api.patch(`/admin/products/${id}/price`, { price }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product price updated!');
      setPriceModalProduct(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleOpenPriceModal = (product: ProductListItem) => {
    setPriceModalProduct(product);
    setNewPrice(product.min_price.toString());
  };

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceModalProduct) return;
    const val = parseFloat(newPrice);
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid price');
      return;
    }
    priceMutation.mutate({ id: priceModalProduct.id, price: val });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-midnight-navy">Products</h1>
        <Link
          to="/admin/products/new"
          id="admin-add-product-btn"
          className="btn-primary py-2.5 px-5 text-sm"
        >
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          id="admin-products-search"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/50"
          placeholder="Search products…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Stock</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td className="px-5 py-4" colSpan={5}>
                        <div className="skeleton h-4 rounded w-3/4" />
                      </td>
                    </tr>
                  ))
                : data?.items.map((product, i) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {product.primary_image ? (
                            <img
                              src={product.primary_image.url}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center flex-shrink-0">
                              <Package size={16} className="text-champagne-gold" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-midnight-navy line-clamp-1">{product.name}</div>
                            <div className="text-xs text-gray-400">{product.variant_count} variant{product.variant_count !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">
                        {product.category.name}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-midnight-navy">
                          <span>
                            {formatCurrency(product.min_price, product.currency)}
                            {product.max_price > product.min_price && (
                              <span className="text-gray-400"> – {formatCurrency(product.max_price, product.currency)}</span>
                            )}
                          </span>
                          <button
                            id={`quick-adjust-price-btn-${product.id}`}
                            onClick={() => handleOpenPriceModal(product)}
                            className="p-1 rounded-md text-champagne-gold hover:bg-gold-50 transition-colors"
                            title="Adjust Price"
                          >
                            <IndianRupee size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.is_in_stock ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                          {product.is_in_stock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`adjust-price-action-${product.id}`}
                            onClick={() => handleOpenPriceModal(product)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-champagne-gold hover:bg-amber-50 transition-colors"
                            title="Adjust Price"
                          >
                            <IndianRupee size={15} />
                          </button>
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            id={`edit-product-${product.id}`}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-champagne-gold hover:bg-amber-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </Link>
                          <button
                            id={`delete-product-${product.id}`}
                            onClick={() => {
                              if (window.confirm('Delete this product?')) {
                                deleteMutation.mutate(product.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Adjust Price Modal */}
      <AnimatePresence>
        {priceModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-midnight-navy font-bold text-lg">
                  <div className="w-8 h-8 rounded-lg bg-gold-50 flex items-center justify-center text-champagne-gold">
                    <IndianRupee size={18} />
                  </div>
                  Adjust Product Price
                </div>
                <button
                  onClick={() => setPriceModalProduct(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-400">Product Name</p>
                <p className="text-sm font-semibold text-midnight-navy line-clamp-1">
                  {priceModalProduct.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Current Price: <span className="font-semibold text-midnight-navy">{formatCurrency(priceModalProduct.min_price, priceModalProduct.currency)}</span>
                </p>
              </div>

              <form onSubmit={handleSavePrice} className="space-y-4">
                <div>
                  <label htmlFor="modal-new-price-input" className="block text-xs font-medium text-gray-700 mb-1.5">
                    New Price (INR ₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                      ₹
                    </span>
                    <input
                      id="modal-new-price-input"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-champagne-gold/50"
                      placeholder="e.g. 1750"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setPriceModalProduct(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="save-adjusted-price-btn"
                    disabled={priceMutation.isPending}
                    className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    {priceMutation.isPending ? 'Updating…' : 'Save New Price'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
