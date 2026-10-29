import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  MessageSquare,
  AlertTriangle,
  IndianRupee,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { AdminStats } from '@/types';

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-midnight-navy">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get<AdminStats>('/admin/stats');
      return data;
    },
  });

  const currency = stats?.currency ?? 'INR';

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-midnight-navy">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 h-24 shadow-sm">
              <div className="skeleton h-3 w-1/3 rounded mb-3" />
              <div className="skeleton h-6 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats?.total_revenue ?? 0, currency)}
            sub={`${formatCurrency(stats?.revenue_this_month ?? 0, currency)} this month`}
            icon={IndianRupee}
            color="bg-amber-50 text-amber-600"
            delay={0}
          />
          <StatCard
            label="Total Orders"
            value={(stats?.total_orders ?? 0).toLocaleString('en-IN')}
            sub={`${stats?.orders_today ?? 0} today`}
            icon={ShoppingBag}
            color="bg-blue-50 text-blue-600"
            delay={0.04}
          />
          <StatCard
            label="Total Customers"
            value={(stats?.total_customers ?? 0).toLocaleString('en-IN')}
            sub={`${stats?.new_customers_this_month ?? 0} new this month`}
            icon={Users}
            color="bg-green-50 text-green-600"
            delay={0.08}
          />
          <StatCard
            label="Open Enquiries"
            value={(stats?.open_enquiries ?? 0).toString()}
            icon={MessageSquare}
            color="bg-purple-50 text-purple-600"
            delay={0.12}
          />
          <StatCard
            label="Low Stock Items"
            value={(stats?.low_stock_items ?? 0).toString()}
            sub="Variants with ≤ 5 units"
            icon={AlertTriangle}
            color="bg-red-50 text-red-500"
            delay={0.16}
          />
          <StatCard
            label="Revenue Trend"
            value="↑ Growing"
            sub="See Reports for details"
            icon={TrendingUp}
            color="bg-teal-50 text-teal-600"
            delay={0.2}
          />
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { to: '/admin/products/new', label: 'Add Product', emoji: '📦' },
            { to: '/admin/orders', label: 'View Orders', emoji: '🛍️' },
            { to: '/admin/enquiries', label: 'Enquiries', emoji: '💬' },
            { to: '/admin/inventory', label: 'Inventory', emoji: '🏭' },
          ].map(({ to, label, emoji }) => (
            <Link
              key={to}
              to={to}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-3 hover:border-champagne-gold hover:shadow-md transition-all duration-200 group"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-sm font-semibold text-midnight-navy group-hover:text-champagne-gold transition-colors">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
