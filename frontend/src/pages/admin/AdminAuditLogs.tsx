import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, ScrollText, Filter } from 'lucide-react';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog, PaginatedResponse } from '@/types';

const RESOURCE_TYPES = [
  'product', 'order', 'user', 'enquiry', 'inventory', 'coupon', 'category',
];

const ACTION_COLORS: Record<string, string> = {
  create: 'text-green-700 bg-green-50',
  update: 'text-blue-700 bg-blue-50',
  delete: 'text-red-700 bg-red-50',
  status_change: 'text-amber-700 bg-amber-50',
  login: 'text-purple-700 bg-purple-50',
  logout: 'text-gray-700 bg-gray-50',
};

function actionColor(action: string): string {
  const key = Object.keys(ACTION_COLORS).find((k) => action.includes(k));
  return key ? ACTION_COLORS[key] : 'text-gray-700 bg-gray-50';
}

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<AuditLog>>({
    queryKey: ['admin-audit-logs', search, resourceType, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', {
        params: {
          q: search || undefined,
          resource_type: resourceType || undefined,
          page,
          size: 25,
        },
      });
      return data;
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText size={22} className="text-champagne-gold" />
        <h1 className="text-2xl font-bold text-midnight-navy">Audit Logs</h1>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="audit-search"
            className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/50 w-52"
            placeholder="Search action, actor…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            id="audit-resource-filter"
            className="pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/50 appearance-none"
            value={resourceType}
            onChange={(e) => { setResourceType(e.target.value); setPage(1); }}
          >
            <option value="">All Resources</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {isLoading
            ? [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-5 py-4">
                  <div className="skeleton h-4 rounded w-3/4 mb-2" />
                  <div className="skeleton h-3 rounded w-1/2" />
                </div>
              ))
            : data?.items.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <button
                    id={`audit-log-${log.id}`}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50/60 transition-colors"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${actionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-500 font-medium capitalize">
                            {log.resource_type}
                          </span>
                          {log.resource_id && (
                            <span className="text-[10px] font-mono text-gray-400">
                              #{log.resource_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          By{' '}
                          <span className="font-medium text-midnight-navy">
                            {log.actor.first_name} {log.actor.last_name}
                          </span>
                          {' · '}{log.actor.email}
                          {log.ip_address && (
                            <span className="text-gray-400"> · {log.ip_address}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                        {formatDateTime(log.created_at)}
                      </div>
                    </div>
                  </button>

                  {expanded === log.id && log.changes && (
                    <div className="px-5 pb-4">
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-xs font-mono">
                        {Object.entries(log.changes).map(([field, { before, after }]) => (
                          <div key={field} className="mb-2 last:mb-0">
                            <span className="text-gray-500 font-semibold">{field}:</span>{' '}
                            <span className="text-red-500 line-through">{JSON.stringify(before)}</span>{' '}
                            →{' '}
                            <span className="text-green-600">{JSON.stringify(after)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
        </div>

        {data && data.pages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{data.total} logs · Page {page} of {data.pages}</span>
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
