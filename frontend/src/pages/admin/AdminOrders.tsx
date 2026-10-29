import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate, getOrderStatusColor, snakeToTitle } from '@/lib/utils';
import type { Order, OrderStatus, PaginatedResponse } from '@/types';

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrders() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Order>>({
    queryKey: ['admin-orders', search, status, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Order>>('/admin/orders', {
        params: { q: search || undefined, status: status || undefined, page, size: 20 },
      });
      return data;
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-midnight-navy">Orders</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="admin-orders-search"
            className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/50 w-52"
            placeholder="Order #, customer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            id="admin-orders-status-filter"
            className="pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/50 appearance-none"
            value={status}
            onChange={(e) => { setStatus(e.target.value as OrderStatus | ''); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{snakeToTitle(s)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Date</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td className="px-5 py-4" colSpan={5}><div className="skeleton h-4 rounded w-3/4" /></td>
                    </tr>
                  ))
                : data?.items.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-midnight-navy">#{order.order_number}</div>
                        <div className="text-xs text-gray-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${getOrderStatusColor(order.status)}`}>
                          {snakeToTitle(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-midnight-navy">
                        {formatCurrency(order.total, order.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          id={`admin-order-${order.id}`}
                          className="inline-flex items-center gap-1 text-xs text-champagne-gold hover:underline font-medium"
                        >
                          View <ChevronRight size={13} />
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Page {page} of {data.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Prev
              </button>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
