import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Package, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import type { Order, PaginatedResponse } from '@/types';
import { formatCurrency, formatDate, getOrderStatusColor, snakeToTitle } from '@/lib/utils';

export default function OrdersPage() {
  const { data, isLoading } = useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Order>>('/orders');
      return data;
    },
  });

  return (
    <div className="page-container py-8 lg:py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-midnight-navy font-semibold mb-8">My Orders</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 space-y-3">
                <div className="skeleton h-4 w-1/3 rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="text-7xl mb-6">📦</div>
            <h2 className="font-display text-2xl text-midnight-navy font-semibold mb-3">No orders yet</h2>
            <p className="text-charcoal/60 mb-8">Start shopping to see your orders here.</p>
            <Link to="/products" id="orders-empty-shop-btn" className="btn-primary px-8 py-4 text-base">
              Shop Now
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {data?.items.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/account/orders/${order.id}`}
                  id={`order-${order.id}`}
                  className="card p-5 flex items-center gap-4 group hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
                    <Package size={20} className="text-champagne-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-midnight-navy text-sm">#{order.order_number}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${getOrderStatusColor(order.status)}`}>
                        {snakeToTitle(order.status)}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal/60">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} · Placed {formatDate(order.created_at)}
                    </p>
                    <p className="text-sm font-semibold text-midnight-navy mt-1">
                      {formatCurrency(order.total, order.currency)}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-charcoal/30 group-hover:text-champagne-gold transition-colors flex-shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
