import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Truck, MapPin, CreditCard } from 'lucide-react';
import api from '@/lib/api';
import type { Order } from '@/types';
import { formatCurrency, formatDate, formatDateTime, getOrderStatusColor, getPaymentStatusColor, snakeToTitle } from '@/lib/utils';

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await api.get<Order>(`/orders/${orderId}`);
      return data;
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="page-container py-12">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="skeleton h-8 w-1/3 rounded" />
          <div className="card p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-4 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="page-container py-8 lg:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <Link
          to="/account/orders"
          id="order-detail-back-btn"
          className="inline-flex items-center gap-2 text-sm text-charcoal/60 hover:text-champagne-gold transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Orders
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl text-midnight-navy font-semibold">
              Order #{order.order_number}
            </h1>
            <p className="text-sm text-charcoal/60 mt-1">Placed on {formatDateTime(order.created_at)}</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <span className={`text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border ${getOrderStatusColor(order.status)}`}>
              {snakeToTitle(order.status)}
            </span>
            <span className={`text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
              Payment: {snakeToTitle(order.payment_status)}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Shipment Tracking */}
          {order.shipment && (
            <section className="card p-6">
              <h2 className="font-semibold text-midnight-navy flex items-center gap-2 mb-4">
                <Truck size={18} className="text-champagne-gold" /> Shipment
              </h2>
              <div className="text-sm space-y-2">
                <div className="flex gap-2">
                  <span className="text-charcoal/60 w-24">Carrier</span>
                  <span className="font-medium text-midnight-navy">{order.shipment.carrier}</span>
                </div>
                {order.shipment.tracking_number && (
                  <div className="flex gap-2">
                    <span className="text-charcoal/60 w-24">Tracking</span>
                    {order.shipment.tracking_url ? (
                      <a
                        href={order.shipment.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        id="tracking-url-link"
                        className="font-medium text-champagne-gold hover:underline"
                      >
                        {order.shipment.tracking_number}
                      </a>
                    ) : (
                      <span className="font-medium text-midnight-navy">{order.shipment.tracking_number}</span>
                    )}
                  </div>
                )}
                {order.shipment.estimated_delivery && (
                  <div className="flex gap-2">
                    <span className="text-charcoal/60 w-24">Est. Delivery</span>
                    <span className="font-medium text-midnight-navy">{formatDate(order.shipment.estimated_delivery)}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Items */}
          <section className="card p-6">
            <h2 className="font-semibold text-midnight-navy flex items-center gap-2 mb-4">
              <Package size={18} className="text-champagne-gold" /> Items Ordered
            </h2>
            <div className="divide-y divide-gold-50">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex justify-between text-sm">
                  <div>
                    <div className="font-medium text-midnight-navy">{item.product_name}</div>
                    <div className="text-charcoal/60 text-xs mt-0.5">{item.variant_description} · SKU: {item.sku}</div>
                    <div className="text-charcoal/60 text-xs mt-0.5">
                      {formatCurrency(item.unit_price, item.currency)} × {item.quantity}
                    </div>
                  </div>
                  <span className="font-semibold text-midnight-navy whitespace-nowrap">
                    {formatCurrency(item.subtotal, item.currency)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gold-100 pt-4 mt-2 space-y-2 text-sm">
              <div className="flex justify-between text-charcoal/70">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                  <span>−{formatCurrency(order.discount_amount, order.currency)}</span>
                </div>
              )}
              {order.shipping_amount > 0 && (
                <div className="flex justify-between text-charcoal/70">
                  <span>Shipping</span>
                  <span>{formatCurrency(order.shipping_amount, order.currency)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-charcoal/70">
                  <span>Tax</span>
                  <span>{formatCurrency(order.tax_amount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-midnight-navy text-base pt-1 border-t border-gold-100">
                <span>Total</span>
                <span>{formatCurrency(order.total, order.currency)}</span>
              </div>
            </div>
          </section>

          {/* Delivery Address */}
          <section className="card p-6">
            <h2 className="font-semibold text-midnight-navy flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-champagne-gold" /> Delivery Address
            </h2>
            <div className="text-sm text-charcoal/70 space-y-1">
              <div className="font-semibold text-midnight-navy">{order.shipping_address.recipient_name}</div>
              <div>{order.shipping_address.address_line1}</div>
              {order.shipping_address.address_line2 && <div>{order.shipping_address.address_line2}</div>}
              <div>{order.shipping_address.city}, {order.shipping_address.state} – {order.shipping_address.postal_code}</div>
              <div>{order.shipping_address.country}</div>
              <div className="mt-1">{order.shipping_address.phone}</div>
            </div>
          </section>

          {/* Notes */}
          {order.notes && (
            <section className="card p-6">
              <h2 className="font-semibold text-midnight-navy mb-3">Order Notes</h2>
              <p className="text-sm text-charcoal/70">{order.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
