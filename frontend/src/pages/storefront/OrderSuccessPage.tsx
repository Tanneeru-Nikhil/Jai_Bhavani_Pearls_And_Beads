import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Truck, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import type { Order } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await api.get<Order>(`/orders/${orderId}`);
      return data;
    },
    enabled: !!orderId,
  });

  return (
    <div className="page-container py-12 lg:py-20">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h1 className="font-display text-4xl text-midnight-navy font-semibold mb-3">Order Placed!</h1>
          <p className="text-charcoal/70 text-lg leading-relaxed">
            Thank you for your purchase. We'll send you a confirmation email shortly.
          </p>
          {order && (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold-50 border border-gold-200 mt-6">
              <span className="text-sm font-semibold text-champagne-gold">Order #{order.order_number}</span>
            </div>
          )}
        </motion.div>

        {/* Order Status Steps */}
        <div className="card p-8 mb-8">
          <h2 className="font-semibold text-midnight-navy mb-6">What happens next?</h2>
          <div className="space-y-5">
            {[
              { icon: CheckCircle, label: 'Order Confirmed', desc: 'Your order has been received', done: true },
              { icon: Package, label: 'Processing', desc: "We're preparing your items", done: false },
              { icon: Truck, label: 'Shipped', desc: 'Your order is on its way', done: false },
            ].map((step, i) => (
              <div key={step.label} className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-emerald-50' : 'bg-ivory-100'}`}>
                  <step.icon size={20} className={step.done ? 'text-emerald-500' : 'text-charcoal/30'} />
                </div>
                <div>
                  <div className={`font-semibold text-sm ${step.done ? 'text-emerald-600' : 'text-charcoal/60'}`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-charcoal/50 mt-0.5">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        {isLoading ? (
          <div className="card p-6 space-y-3">
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        ) : order ? (
          <div className="card p-6 mb-8">
            <h2 className="font-semibold text-midnight-navy mb-5">Order Details</h2>
            <div className="space-y-2 text-sm mb-5">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-charcoal/70">{item.product_name} ×{item.quantity}</span>
                  <span className="font-medium text-midnight-navy">{formatCurrency(item.subtotal, item.currency)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gold-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-charcoal/70">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              {order.shipping_amount > 0 && (
                <div className="flex justify-between text-charcoal/70">
                  <span>Shipping</span>
                  <span>{formatCurrency(order.shipping_amount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-midnight-navy text-base pt-1">
                <span>Total</span>
                <span>{formatCurrency(order.total, order.currency)}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/account/orders"
            id="success-track-orders-btn"
            className="btn-primary flex-1 justify-center py-4"
          >
            Track Orders <ArrowRight size={18} />
          </Link>
          <Link
            to="/products"
            id="success-continue-shopping-btn"
            className="btn-secondary flex-1 justify-center py-4"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
