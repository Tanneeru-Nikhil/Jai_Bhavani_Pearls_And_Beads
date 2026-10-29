import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { ProductListItem } from '@/types';

interface WishlistItem {
  id: string;
  product: ProductListItem;
  added_at: string;
}

export default function WishlistPage() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<WishlistItem[]>({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const { data } = await api.get<WishlistItem[]>('/wishlist');
      return data;
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Removed from wishlist');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="page-container py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl text-midnight-navy font-semibold mb-8 flex items-center gap-3">
          <Heart size={28} className="text-champagne-gold" />
          My Wishlist
        </h1>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 space-y-3">
                <div className="skeleton h-48 rounded-xl" />
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="text-7xl mb-6">💎</div>
            <h2 className="font-display text-2xl text-midnight-navy font-semibold mb-3">
              Your wishlist is empty
            </h2>
            <p className="text-charcoal/60 mb-8">
              Save items you love for later.
            </p>
            <Link
              to="/products"
              id="wishlist-empty-shop-btn"
              className="btn-primary px-8 py-4 text-base"
            >
              Explore Products
            </Link>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="card overflow-hidden group"
                >
                  <Link
                    to={`/products/${item.product.slug}`}
                    className="block relative"
                  >
                    <div className="aspect-square bg-gold-50 overflow-hidden">
                      {item.product.primary_image ? (
                        <img
                          src={item.product.primary_image.url}
                          alt={item.product.primary_image.alt_text}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">
                          💎
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link to={`/products/${item.product.slug}`}>
                      <h3 className="font-semibold text-midnight-navy text-sm mb-1 hover:text-champagne-gold transition-colors line-clamp-2">
                        {item.product.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-charcoal/60 mb-3">
                      {item.product.category.name}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-midnight-navy text-sm">
                        {formatCurrency(item.product.min_price, item.product.currency)}
                        {item.product.max_price > item.product.min_price && (
                          <span className="text-xs text-charcoal/50 font-normal">
                            {' '}– {formatCurrency(item.product.max_price, item.product.currency)}
                          </span>
                        )}
                      </span>
                      <div className="flex gap-2">
                        <Link
                          to={`/products/${item.product.slug}`}
                          id={`wishlist-view-${item.product.id}`}
                          className="btn-primary py-1.5 px-3 text-xs"
                        >
                          <ShoppingBag size={12} />
                          View
                        </Link>
                        <button
                          id={`wishlist-remove-${item.product.id}`}
                          onClick={() => removeMutation.mutate(item.product.id)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove from wishlist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
