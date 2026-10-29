import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, ShoppingBag, Users, IndianRupee } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface RevenueData {
  period: string;
  revenue: number;
  orders: number;
}

interface ReportSummary {
  currency: string;
  revenue_by_period: RevenueData[];
  top_products: { product_name: string; revenue: number; units_sold: number }[];
  top_categories: { category_name: string; revenue: number; orders: number }[];
  new_customers_trend: { period: string; count: number }[];
}

type Period = '7d' | '30d' | '90d' | '12m';

export default function AdminReports() {
  const [period, setPeriod] = useState<Period>('30d');

  const { data, isLoading } = useQuery<ReportSummary>({
    queryKey: ['admin-reports', period],
    queryFn: async () => {
      const { data } = await api.get<ReportSummary>('/admin/reports', { params: { period } });
      return data;
    },
  });

  const currency = data?.currency ?? 'INR';
  const revenueList = data?.revenue_by_period ?? [];
  const topProducts = data?.top_products ?? [];
  const topCategories = data?.top_categories ?? [];
  const customerTrend = data?.new_customers_trend ?? [];

  const totalRevenue = revenueList.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalOrders = revenueList.reduce((s, r) => s + (r.orders || 0), 0);
  const maxRevenue = Math.max(...(revenueList.map((r) => r.revenue || 0)), 1);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-midnight-navy">Reports</h1>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {(['7d', '30d', '90d', '12m'] as Period[]).map((p) => (
            <button
              key={p}
              id={`report-period-${p}`}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p ? 'bg-white shadow-sm text-midnight-navy' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '12 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue, currency), icon: IndianRupee, color: 'bg-amber-50 text-amber-600' },
          { label: 'Total Orders', value: totalOrders.toLocaleString('en-IN'), icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
          { label: 'Avg. Order Value', value: totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders, currency) : '—', icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          {
            label: 'New Customers',
            value: (customerTrend.reduce((s, r) => s + (r.count || 0), 0)).toLocaleString('en-IN'),
            icon: Users,
            color: 'bg-purple-50 text-purple-600',
          },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={17} />
              </div>
            </div>
            <p className="text-2xl font-bold text-midnight-navy">
              {isLoading ? <span className="skeleton inline-block w-20 h-6 rounded" /> : value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="font-semibold text-midnight-navy mb-6 flex items-center gap-2">
            <BarChart2 size={18} className="text-champagne-gold" /> Revenue Over Time
          </h2>
          {isLoading ? (
            <div className="h-48 skeleton rounded-xl" />
          ) : (
            <div className="flex items-end gap-1.5 h-48 overflow-x-auto pb-2">
              {revenueList.map((r) => (
                <div key={r.period} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className="text-[9px] text-gray-400 font-semibold">
                    {formatCurrency(r.revenue, currency, true)}
                  </div>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${maxRevenue > 0 ? Math.max((r.revenue / maxRevenue) * 160, 4) : 4}px`,
                      background: 'linear-gradient(180deg, #D7B15D, #C49A3A)',
                    }}
                    title={`${r.period}: ${formatCurrency(r.revenue, currency)}`}
                  />
                  <div className="text-[9px] text-gray-400 truncate w-full text-center">{r.period}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="font-semibold text-midnight-navy mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-champagne-gold" /> Top Products
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((p, i) => {
                const maxRev = Math.max(...(topProducts.map((x) => x.revenue || 0)), 1);
                return (
                  <div key={p.product_name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium truncate pr-2">{i + 1}. {p.product_name}</span>
                      <span className="text-midnight-navy font-semibold whitespace-nowrap">
                        {formatCurrency(p.revenue, currency)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxRev > 0 ? (p.revenue / maxRev) * 100 : 0}%`,
                          background: 'linear-gradient(90deg, #D7B15D, #C49A3A)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Top Categories */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <h2 className="font-semibold text-midnight-navy mb-4">Top Categories</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Category</th>
                <th className="text-right py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Revenue</th>
                <th className="text-right py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? [1, 2, 3].map((i) => (
                    <tr key={i}><td colSpan={3} className="py-3"><div className="skeleton h-4 rounded w-full" /></td></tr>
                  ))
                : topCategories.map((cat) => (
                    <tr key={cat.category_name} className="hover:bg-gray-50/50">
                      <td className="py-3 font-medium text-midnight-navy">{cat.category_name}</td>
                      <td className="py-3 text-right font-semibold text-midnight-navy">
                        {formatCurrency(cat.revenue, currency)}
                      </td>
                      <td className="py-3 text-right text-gray-500">{cat.orders}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}


