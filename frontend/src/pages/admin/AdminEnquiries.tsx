import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Filter, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import { formatDate, snakeToTitle } from '@/lib/utils';
import type { Enquiry, EnquiryStatus, PaginatedResponse, User } from '@/types';

const STATUSES: EnquiryStatus[] = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];

const STATUS_COLORS: Record<string, string> = {
  open: 'text-blue-600 bg-blue-50 border-blue-200',
  in_progress: 'text-amber-600 bg-amber-50 border-amber-200',
  waiting_customer: 'text-orange-600 bg-orange-50 border-orange-200',
  resolved: 'text-green-600 bg-green-50 border-green-200',
  closed: 'text-gray-600 bg-gray-50 border-gray-200',
};

export default function AdminEnquiries() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EnquiryStatus | ''>('');
  const [page, setPage] = useState(1);
  const [assigning, setAssigning] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Enquiry>>({
    queryKey: ['admin-enquiries', search, status, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Enquiry>>('/admin/enquiries', {
        params: { q: search || undefined, status: status || undefined, page, size: 20 },
      });
      return data;
    },
  });

  const { data: staffList = [] } = useQuery<User[]>({
    queryKey: ['admin-staff'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/admin/users', {
        params: { role: 'support' },
      });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.patch(`/admin/enquiries/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-enquiries'] });
      toast.success('Enquiry updated');
      setAssigning(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-midnight-navy">Enquiries</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="admin-enquiries-search"
            className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/50 w-52"
            placeholder="Search subject, ref…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            id="admin-enquiry-status-filter"
            className="pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/50 appearance-none"
            value={status}
            onChange={(e) => { setStatus(e.target.value as EnquiryStatus | ''); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{snakeToTitle(s)}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Customer</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Subject</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Assigned To</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? [1, 2, 3].map((i) => (
                    <tr key={i}><td className="px-5 py-4" colSpan={6}><div className="skeleton h-4 rounded w-3/4" /></td></tr>
                  ))
                : data?.items.map((enq, i) => (
                    <motion.tr
                      key={enq.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-xs text-midnight-navy">{enq.reference}</div>
                        <div className="text-xs text-gray-400">{formatDate(enq.created_at)}</div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell text-gray-600">
                        {enq.customer.first_name} {enq.customer.last_name}
                        <div className="text-xs text-gray-400">{enq.customer.email}</div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell text-gray-700 max-w-xs">
                        <div className="truncate">{enq.subject}</div>
                        <div className="text-xs text-gray-400">{enq.category}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          id={`enq-status-${enq.id}`}
                          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border appearance-none cursor-pointer ${STATUS_COLORS[enq.status] ?? ''}`}
                          value={enq.status}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: enq.id,
                              payload: { status: e.target.value },
                            })
                          }
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{snakeToTitle(s)}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {enq.assigned_to ? (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <UserCheck size={12} className="text-green-500" />
                            {enq.assigned_to.first_name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/enquiries/${enq.id}`}
                          id={`admin-enq-view-${enq.id}`}
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
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
