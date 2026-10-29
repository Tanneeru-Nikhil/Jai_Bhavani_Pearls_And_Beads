import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Truck, MapPin, CreditCard, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getOrderStatusColor,
  getPaymentStatusColor,
  snakeToTitle,
} from '@/lib/utils';
import type { Order, OrderStatus, PaymentStatus } from '@/types';

const ORDER_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
];
const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending', 'paid', 'failed', 'refunded', 'partially_refunded',
];

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [newPayStatus, setNewPayStatus] = useState<PaymentStatus | ''>('');
  const [trackingForm, setTrackingForm] = useState({
    carrier: '',
    tracking_number: '',
    tracking_url: '',
    estimated_delivery: '',
  });

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['admin-order', id],
    queryFn: async () => {
      const { data } = await api.get<Order>(`/admin/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (order) {
      setNewStatus(order.status);
      setNewPayStatus(order.payment_status);
      if (order.shipment) {
        setTrackingForm({
          carrier: order.shipment.carrier,
          tracking_number: order.shipment.tracking_number ?? '',
          tracking_url: order.shipment.tracking_url ?? '',
          estimated_delivery: order.shipment.estimated_delivery ?? '',
        });
      }
    }
  }, [order?.id]);

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { status?: OrderStatus; payment_status?: PaymentStatus }) =>
      api.patch(`/admin/orders/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      toast.success('Order updated!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateShipmentMutation = useMutation({
    mutationFn: (payload: typeof trackingForm) =>
      order?.shipment
        ? api.patch(`/admin/orders/${id}/shipment`, payload)
        : api.post(`/admin/orders/${id}/shipment`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      toast.success('Shipment updated!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="skeleton h-8 w-1/3 rounded" />
        <div className="bg-white rounded-2xl p-6 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-4 rounded" />)}
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/admin/orders"
          id="admin-order-detail-back"
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-midnight-navy transition-all"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">Order #{order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatDateTime(order.created_at)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h2 className="font-semibold text-midnight-navy flex items-center gap-2 mb-4">
              <Package size={18} className="text-champagne-gold" /> Items
            </h2>
            <div className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex justify-between text-sm gap-4">
                  <div>
                    <div className="font-medium text-midnight-navy">{item.product_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.variant_description} · SKU: {item.sku}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatCurrency(item.unit_price, item.currency)} × {item.quantity}
                    </div>
                  </div>
                  <span className="font-semibold text-midnight-navy whitespace-nowrap">
                    {formatCurrency(item.subtotal, item.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 mt-2 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                  <span>−{formatCurrency(order.discount_amount, order.currency)}</span>
                </div>
              )}
              {order.shipping_amount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span><span>{formatCurrency(order.shipping_amount, order.currency)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span><span>{formatCurrency(order.tax_amount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-midnight-navy text-base pt-1 border-t border-gray-100">
                <span>Total</span><span>{formatCurrency(order.total, order.currency)}</span>
              </div>
            </div>
          </motion.div>

          {/* Shipping Address */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h2 className="font-semibold text-midnight-navy flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-champagne-gold" /> Shipping Address
            </h2>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="font-semibold text-midnight-navy">{order.shipping_address.recipient_name}</div>
              <div>{order.shipping_address.address_line1}</div>
              {order.shipping_address.address_line2 && <div>{order.shipping_address.address_line2}</div>}
              <div>{order.shipping_address.city}, {order.shipping_address.state} – {order.shipping_address.postal_code}</div>
              <div>{order.shipping_address.country}</div>
              <div className="mt-1">{order.shipping_address.phone}</div>
            </div>
          </motion.div>

          {/* Shipment */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h2 className="font-semibold text-midnight-navy flex items-center gap-2 mb-4">
              <Truck size={18} className="text-champagne-gold" /> Shipment
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Carrier</label>
                <input
                  id="shipment-carrier"
                  className="input-field"
                  value={trackingForm.carrier}
                  onChange={(e) => setTrackingForm((f) => ({ ...f, carrier: e.target.value }))}
                  placeholder="BlueDart, DTDC…"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tracking Number</label>
                <input
                  id="shipment-tracking"
                  className="input-field"
                  value={trackingForm.tracking_number}
                  onChange={(e) => setTrackingForm((f) => ({ ...f, tracking_number: e.target.value }))}
                  placeholder="BDA12345678"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tracking URL</label>
                <input
                  id="shipment-tracking-url"
                  className="input-field"
                  value={trackingForm.tracking_url}
                  onChange={(e) => setTrackingForm((f) => ({ ...f, tracking_url: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Estimated Delivery</label>
                <input
                  id="shipment-est-delivery"
                  type="date"
                  className="input-field"
                  value={trackingForm.estimated_delivery}
                  onChange={(e) => setTrackingForm((f) => ({ ...f, estimated_delivery: e.target.value }))}
                />
              </div>
            </div>
            <button
              id="shipment-save-btn"
              onClick={() => updateShipmentMutation.mutate(trackingForm)}
              disabled={updateShipmentMutation.isPending || !trackingForm.carrier}
              className="btn-primary py-2 px-5 text-sm"
            >
              <Save size={14} />
              {updateShipmentMutation.isPending ? 'Saving…' : order.shipment ? 'Update Shipment' : 'Add Shipment'}
            </button>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h2 className="font-semibold text-midnight-navy mb-4">Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Order Status</label>
                <select
                  id="admin-order-status"
                  className="input-field"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{snakeToTitle(s)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Payment Status</label>
                <select
                  id="admin-payment-status"
                  className="input-field"
                  value={newPayStatus}
                  onChange={(e) => setNewPayStatus(e.target.value as PaymentStatus)}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{snakeToTitle(s)}</option>
                  ))}
                </select>
              </div>
              <button
                id="admin-status-save-btn"
                onClick={() =>
                  updateStatusMutation.mutate({
                    status: newStatus as OrderStatus,
                    payment_status: newPayStatus as PaymentStatus,
                  })
                }
                disabled={updateStatusMutation.isPending}
                className="btn-primary w-full py-2.5 text-sm"
              >
                {updateStatusMutation.isPending ? 'Updating…' : 'Update Status'}
              </button>
            </div>
          </motion.div>

          {/* Current badges */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
            <h2 className="font-semibold text-midnight-navy mb-3">Current Status</h2>
            <div>
              <div className="text-xs text-gray-500 mb-1">Order</div>
              <span className={`text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border ${getOrderStatusColor(order.status)}`}>
                {snakeToTitle(order.status)}
              </span>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Payment</div>
              <span className={`text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
                {snakeToTitle(order.payment_status)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
