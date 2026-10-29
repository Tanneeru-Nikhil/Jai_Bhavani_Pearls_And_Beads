import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, CreditCard, Tag, ArrowRight, Plus } from 'lucide-react';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import type { Cart, Address, CheckoutSummary } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';
import AddressModal from '@/components/ui/AddressModal';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cart } = useCart();
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [notes, setNotes] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const { data: addresses } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<Address[]>('/users/me/addresses');
      return data;
    },
  });

  const { data: summary } = useQuery<CheckoutSummary>({
    queryKey: ['checkout-summary', appliedCoupon],
    queryFn: async () => {
      const { data } = await api.post<CheckoutSummary>('/checkout/preview', {
        coupon_code: appliedCoupon || undefined,
      });
      return data;
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: () =>
      api.post('/orders', {
        address_id: selectedAddressId,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      navigate(`/orders/success/${res.data.id}`);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      await api.post('/checkout/validate-coupon', { code: couponCode });
      setAppliedCoupon(couponCode);
      toast.success('Coupon applied!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }
    placeOrderMutation.mutate();
  };

  return (
    <div className="page-container py-8 lg:py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-3xl text-midnight-navy font-semibold mb-8">Checkout</h1>

        <form id="checkout-form" onSubmit={handleSubmit}>
          <div className="lg:grid lg:grid-cols-3 lg:gap-10">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6 mb-8 lg:mb-0">
              {/* Delivery Address */}
              <section className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-midnight-navy text-lg flex items-center gap-2">
                    <MapPin size={20} className="text-champagne-gold" /> Delivery Address
                  </h2>
                  <button
                    type="button"
                    id="checkout-add-new-address-btn"
                    onClick={() => setAddressModalOpen(true)}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Add Address
                  </button>
                </div>

                {addresses && addresses.length > 0 ? (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        htmlFor={`addr-${addr.id}`}
                        className={`flex gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-champagne-gold bg-gold-50'
                            : 'border-transparent bg-ivory-100 hover:border-gold-200'
                        }`}
                      >
                        <input
                          id={`addr-${addr.id}`}
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 w-4 h-4 text-champagne-gold border-gold-300 focus:ring-champagne-gold"
                        />
                        <div className="text-sm">
                          <div className="font-semibold text-midnight-navy flex items-center gap-2">
                            <span>{addr.recipient_name}</span>
                            <span className="text-xs text-charcoal/50 font-normal">({addr.label})</span>
                            {addr.is_default && (
                              <span className="badge-gold text-[10px]">Default</span>
                            )}
                          </div>
                          <div className="text-charcoal/70 mt-0.5">
                            {addr.address_line1}
                            {addr.address_line2 ? `, ${addr.address_line2}` : ''},{' '}
                            {addr.city}, {addr.state} – {addr.postal_code}
                          </div>
                          <div className="text-charcoal/60 mt-0.5">{addr.phone}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-ivory-100 rounded-xl">
                    <p className="text-charcoal/60 text-sm mb-3">No saved addresses yet</p>
                    <button
                      type="button"
                      id="checkout-add-address-btn"
                      onClick={() => setAddressModalOpen(true)}
                      className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
                    >
                      <Plus size={14} /> Add New Address
                    </button>
                  </div>
                )}
              </section>

              {/* Coupon Code */}
              <section className="card p-6">
                <h2 className="font-semibold text-midnight-navy text-lg flex items-center gap-2 mb-5">
                  <Tag size={20} className="text-champagne-gold" /> Coupon Code
                </h2>
                <div className="flex gap-3">
                  <input
                    id="coupon-code-input"
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="input-field"
                  />
                  <button
                    type="button"
                    id="apply-coupon-btn"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="btn-secondary px-5 py-2 flex-shrink-0 disabled:opacity-50"
                  >
                    {couponLoading ? 'Applying…' : 'Apply'}
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="text-emerald-600 text-sm mt-2 font-medium">✓ Coupon "{appliedCoupon}" applied</p>
                )}
              </section>

              {/* Payment Method */}
              <section className="card p-6">
                <h2 className="font-semibold text-midnight-navy text-lg flex items-center gap-2 mb-5">
                  <CreditCard size={20} className="text-champagne-gold" /> Payment Method
                </h2>
                <div className="space-y-3">
                  {[
                    { value: 'cod' as const, label: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: '💵' },
                    { value: 'razorpay' as const, label: 'Online Payment', desc: 'Cards, UPI, Net Banking via Razorpay', icon: '💳' },
                  ].map((method) => (
                    <label
                      key={method.value}
                      htmlFor={`payment-${method.value}`}
                      className={`flex gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === method.value
                          ? 'border-champagne-gold bg-gold-50'
                          : 'border-transparent bg-ivory-100 hover:border-gold-200'
                      }`}
                    >
                      <input
                        id={`payment-${method.value}`}
                        type="radio"
                        name="payment_method"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={() => setPaymentMethod(method.value)}
                        className="mt-1 w-4 h-4 text-champagne-gold border-gold-300"
                      />
                      <div>
                        <div className="font-semibold text-midnight-navy text-sm">
                          {method.icon} {method.label}
                        </div>
                        <div className="text-charcoal/60 text-xs mt-0.5">{method.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Notes */}
              <section className="card p-6">
                <label htmlFor="order-notes" className="block font-semibold text-midnight-navy text-sm mb-3">
                  Order Notes <span className="text-charcoal/40 font-normal">(optional)</span>
                </label>
                <textarea
                  id="order-notes"
                  rows={3}
                  placeholder="Any special instructions for your order…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field resize-none"
                />
              </section>
            </div>

            {/* Order Summary */}
            <div>
              <div className="card-premium p-6 sticky top-24">
                <h2 className="font-semibold text-midnight-navy text-lg mb-5">Order Summary</h2>

                {/* Items */}
                {cart?.items.map((item) => (
                  <div key={item.id} className="flex gap-2 mb-3 text-sm">
                    <span className="text-charcoal/70 flex-1 line-clamp-1">{item.variant.product.name}</span>
                    <span className="text-charcoal/50">×{item.quantity}</span>
                    <span className="font-medium text-midnight-navy whitespace-nowrap">
                      {formatCurrency(item.subtotal, item.variant.currency)}
                    </span>
                  </div>
                ))}

                <div className="border-t border-gold-100 pt-4 mt-2 space-y-2 text-sm">
                  <div className="flex justify-between text-charcoal/70">
                    <span>Subtotal</span>
                    <span>{formatCurrency(summary?.subtotal ?? cart?.subtotal ?? 0, 'INR')}</span>
                  </div>
                  {(summary?.discount_amount ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>−{formatCurrency(summary!.discount_amount, 'INR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-charcoal/70">
                    <span>Shipping</span>
                    <span className="text-emerald-600 font-medium">
                      {summary?.shipping_amount === 0 ? 'Free' : formatCurrency(summary?.shipping_amount ?? 0, 'INR')}
                    </span>
                  </div>
                  {(summary?.tax_amount ?? 0) > 0 && (
                    <div className="flex justify-between text-charcoal/70">
                      <span>Tax</span>
                      <span>{formatCurrency(summary!.tax_amount, 'INR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-midnight-navy text-base pt-2 border-t border-gold-100">
                    <span>Total</span>
                    <span>{formatCurrency(summary?.total ?? cart?.subtotal ?? 0, 'INR')}</span>
                  </div>
                </div>

                <motion.button
                  id="place-order-btn"
                  type="submit"
                  disabled={placeOrderMutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary w-full justify-center py-4 text-base mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {placeOrderMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-midnight-navy/30 border-t-midnight-navy animate-spin" />
                      Placing Order…
                    </span>
                  ) : (
                    <>Place Order <ArrowRight size={18} /></>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <AddressModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSuccess={(newId) => {
          queryClient.invalidateQueries({ queryKey: ['addresses'] });
          if (newId) setSelectedAddressId(newId);
        }}
      />
    </div>
  );
}
