import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, ChevronRight, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import { formatDate, snakeToTitle } from '@/lib/utils';
import type { Enquiry, PaginatedResponse } from '@/types';

const CATEGORIES = [
  'Product Inquiry',
  'Order Issue',
  'Bulk / Wholesale',
  'Custom Order',
  'Shipping Query',
  'Return / Refund',
  'Other',
];

const STATUS_COLORS: Record<string, string> = {
  open: 'text-blue-600 bg-blue-50',
  in_progress: 'text-amber-600 bg-amber-50',
  waiting_customer: 'text-orange-600 bg-orange-50',
  resolved: 'text-green-600 bg-green-50',
  closed: 'text-gray-600 bg-gray-50',
};

export default function EnquiryPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', subject: '', message: '' });

  const { data, isLoading } = useQuery<PaginatedResponse<Enquiry>>({
    queryKey: ['enquiries'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Enquiry>>('/enquiries');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/enquiries', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      toast.success('Enquiry submitted!');
      setForm({ category: '', subject: '', message: '' });
      setShowForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="page-container py-8 lg:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl text-midnight-navy font-semibold flex items-center gap-3">
              <MessageSquare size={28} className="text-champagne-gold" />
              My Enquiries
            </h1>
            <p className="text-charcoal/60 text-sm mt-1">
              Ask about products, orders, or bulk pricing.
            </p>
          </div>
          <button
            id="new-enquiry-btn"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary py-2.5 px-5 text-sm flex-shrink-0"
          >
            <Plus size={16} />
            New Enquiry
          </button>
        </div>

        {/* New Enquiry Form */}
        {showForm && (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 mb-6"
          >
            <h2 className="font-semibold text-midnight-navy mb-4">New Enquiry</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs text-charcoal/60 mb-1.5">Category</label>
                <select
                  id="enquiry-category"
                  className="input-field"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 mb-1.5">Subject</label>
                <input
                  id="enquiry-subject"
                  className="input-field"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief summary of your enquiry"
                  required
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 mb-1.5">Message</label>
                <textarea
                  id="enquiry-message"
                  className="input-field resize-none"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Describe your enquiry in detail…"
                  required
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  id="enquiry-submit-btn"
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary py-2.5 px-6 text-sm"
                >
                  {createMutation.isPending ? 'Submitting…' : 'Submit Enquiry'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary py-2.5 px-6 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.section>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="skeleton h-4 w-1/2 rounded" />
                <div className="skeleton h-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="text-7xl mb-6">💬</div>
            <h2 className="font-display text-2xl text-midnight-navy font-semibold mb-3">
              No enquiries yet
            </h2>
            <p className="text-charcoal/60 mb-8">
              Have a question? Create your first enquiry above.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {data?.items.map((enq, i) => (
              <motion.div
                key={enq.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/enquiries/${enq.id}`}
                  id={`enquiry-${enq.id}`}
                  className="card p-5 flex items-center gap-4 group hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={18} className="text-champagne-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-midnight-navy text-sm truncate">
                        {enq.subject}
                      </span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[enq.status] ?? 'text-gray-600 bg-gray-50'}`}>
                        {snakeToTitle(enq.status)}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal/60 flex items-center gap-1.5">
                      <Clock size={10} /> {formatDate(enq.created_at)} · {enq.category}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-charcoal/30 group-hover:text-champagne-gold transition-colors flex-shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
