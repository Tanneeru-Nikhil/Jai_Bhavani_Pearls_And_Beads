import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, MessageSquare, FileText, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime, snakeToTitle } from '@/lib/utils';
import type { Enquiry } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  open: 'text-blue-600 bg-blue-50 border-blue-200',
  in_progress: 'text-amber-600 bg-amber-50 border-amber-200',
  waiting_customer: 'text-orange-600 bg-orange-50 border-orange-200',
  resolved: 'text-green-600 bg-green-50 border-green-200',
  closed: 'text-gray-600 bg-gray-50 border-gray-200',
};

export default function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: enquiry, isLoading } = useQuery<Enquiry>({
    queryKey: ['enquiry', id],
    queryFn: async () => {
      const { data } = await api.get<Enquiry>(`/enquiries/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 15000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [enquiry?.messages]);

  const replyMutation = useMutation({
    mutationFn: (body: string) =>
      api.post(`/enquiries/${id}/messages`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiry', id] });
      setMessage('');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="page-container py-12">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="skeleton h-8 w-1/3 rounded" />
          <div className="card p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-4 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!enquiry) return null;

  const isClosed = ['resolved', 'closed'].includes(enquiry.status);

  return (
    <div className="page-container py-8 lg:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link
          to="/enquiries"
          id="enquiry-detail-back-btn"
          className="inline-flex items-center gap-2 text-sm text-charcoal/60 hover:text-champagne-gold transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Enquiries
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl text-midnight-navy font-semibold">
              {enquiry.subject}
            </h1>
            <p className="text-xs text-charcoal/60 mt-1 flex items-center gap-1.5">
              <Clock size={11} />
              #{enquiry.reference} · {enquiry.category} · {formatDateTime(enquiry.created_at)}
            </p>
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border flex-shrink-0 ${STATUS_COLORS[enquiry.status] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
            {snakeToTitle(enquiry.status)}
          </span>
        </div>

        {/* Quotation card */}
        {enquiry.quotation && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-premium p-4 mb-4 flex items-center gap-3"
          >
            <FileText size={20} className="text-champagne-gold flex-shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-midnight-navy">
                Quotation #{enquiry.quotation.reference}
              </div>
              <div className="text-charcoal/60 text-xs">
                Status: {snakeToTitle(enquiry.quotation.status)} · Valid until{' '}
                {new Date(enquiry.quotation.valid_until).toLocaleDateString('en-IN')}
              </div>
            </div>
            <div className="font-bold text-midnight-navy">
              ₹{enquiry.quotation.amount.toLocaleString('en-IN')}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <div className="card p-4 space-y-4 mb-4 max-h-[480px] overflow-y-auto">
          {enquiry.messages.map((msg) => {
            const isMe = msg.sender.id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    isMe
                      ? 'bg-midnight-navy text-white rounded-br-md'
                      : 'bg-gold-50 text-midnight-navy rounded-bl-md'
                  }`}
                >
                  {!isMe && (
                    <div className="font-semibold text-xs text-champagne-gold mb-1">
                      {msg.sender.first_name} {msg.sender.last_name}
                      {['admin', 'support'].includes(msg.sender.role) && (
                        <span className="ml-1 text-[9px] text-white/60 bg-midnight-navy/30 px-1.5 py-0.5 rounded-full">
                          Team
                        </span>
                      )}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                </div>
                <span className="text-[10px] text-charcoal/40 mt-1 px-1">
                  {formatDateTime(msg.created_at)}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply Box */}
        {!isClosed ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) replyMutation.mutate(message.trim());
            }}
            className="flex gap-3 items-end"
          >
            <textarea
              id="enquiry-reply-input"
              className="input-field flex-1 resize-none"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your reply…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (message.trim()) replyMutation.mutate(message.trim());
                }
              }}
            />
            <button
              id="enquiry-reply-btn"
              type="submit"
              disabled={!message.trim() || replyMutation.isPending}
              className="btn-primary py-3 px-4 flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        ) : (
          <div className="text-center py-4 text-sm text-charcoal/50 flex items-center justify-center gap-2">
            <MessageSquare size={14} />
            This enquiry is {snakeToTitle(enquiry.status).toLowerCase()} and no longer accepts replies.
          </div>
        )}
      </div>
    </div>
  );
}
