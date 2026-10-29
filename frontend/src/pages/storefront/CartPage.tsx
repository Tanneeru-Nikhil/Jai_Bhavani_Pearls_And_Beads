import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/api';

export default function CartPage() {
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const { isAuthenticated } = useAuth();

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    try {
      await updateItem(itemId, newQty);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast.success('Item removed from cart');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="page-container py-12">
        <div className="max-w-4xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 flex gap-4">
              <div className="skeleton w-24 h-24 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
                <div className="skeleton h-5 w-1/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="page-container py-8 lg:py-12">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-full bg-gold-50 flex items-center justify-center">
            <ShoppingBag size={20} className="text-champagne-gold" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-midnight-navy font-semibold">Shopping Cart</h1>
            {!isEmpty && (
              <p className="text-sm text-charcoal/60">{cart.item_count} item{cart.item_count !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="text-7xl mb-6">🛒</div>
            <h2 className="font-display text-2xl text-midnight-navy font-semibold mb-3">Your cart is empty</h2>
            <p className="text-charcoal/60 mb-8">Add some beautiful beads and pearls to get started!</p>
            <Link to="/products" id="cart-empty-shop-btn" className="btn-primary px-8 py-4 text-base">
              Shop Now <ArrowRight size={18} />
            </Link>
          </motion.div>
        ) : (
          <div className="lg:grid lg:grid-cols-3 lg:gap-10">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4 mb-8 lg:mb-0">
              <AnimatePresence>
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="card p-4 flex gap-4"
                  >
                    {/* Image */}
                    <Link
                      to={`/products/${item.variant.product.slug}`}
                      className="flex-shrink-0"
                    >
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-ivory-100">
                        {item.variant.images?.[0] ? (
                          <img
                            src={item.variant.images[0].url}
                            alt={item.variant.images[0].alt_text}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">💎</div>
                        )}
                      </div>
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${item.variant.product.slug}`}
                        className="font-medium text-midnight-navy text-sm hover:text-champagne-gold transition-colors line-clamp-2"
                      >
                        {item.variant.product.name}
                      </Link>
                      <p className="text-xs text-charcoal/50 mt-1">SKU: {item.variant.sku}</p>
                      {(item.variant.color || item.variant.size_mm) && (
                        <p className="text-xs text-charcoal/60 mt-0.5">
                          {[item.variant.color, item.variant.size_mm && `${item.variant.size_mm}mm`]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity control */}
                        <div className="flex items-center gap-2">
                          <button
                            id={`cart-qty-minus-${item.id}`}
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="qty-btn w-8 h-8"
                          >
                            <Minus size={14} />
                          </button>
                          <span
                            id={`cart-qty-${item.id}`}
                            className="w-10 text-center text-sm font-semibold text-midnight-navy"
                            aria-label={`Quantity: ${item.quantity}`}
                          >
                            {item.quantity}
                          </span>
                          <button
                            id={`cart-qty-plus-${item.id}`}
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="qty-btn w-8 h-8"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-midnight-navy text-sm">
                            {formatCurrency(item.subtotal, item.variant.currency)}
                          </span>
                          <button
                            id={`cart-remove-${item.id}`}
                            onClick={() => handleRemove(item.id)}
                            aria-label={`Remove ${item.variant.product.name}`}
                            className="text-charcoal/30 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <Link
                to="/products"
                id="cart-continue-shopping-link"
                className="inline-flex items-center gap-2 text-sm text-charcoal/60 hover:text-champagne-gold transition-colors mt-2"
              >
                <ArrowLeft size={16} /> Continue Shopping
              </Link>
            </div>

            {/* Order Summary */}
            <div>
              <div className="card-premium p-6 sticky top-24">
                <h2 className="font-semibold text-midnight-navy text-lg mb-5">Order Summary</h2>

                <div className="space-y-3 text-sm mb-5">
                  <div className="flex justify-between text-charcoal/70">
                    <span>Subtotal ({cart.item_count} items)</span>
                    <span className="font-medium text-midnight-navy">{formatCurrency(cart.subtotal, cart.currency)}</span>
                  </div>
                  <div className="flex justify-between text-charcoal/70">
                    <span>Shipping</span>
                    <span className="text-emerald-600 font-medium">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t border-gold-100 pt-4 mb-6">
                  <div className="flex justify-between font-semibold text-midnight-navy">
                    <span>Total</span>
                    <span className="text-lg">{formatCurrency(cart.subtotal, cart.currency)}</span>
                  </div>
                </div>

                {isAuthenticated ? (
                  <Link
                    to="/checkout"
                    id="cart-checkout-btn"
                    className="btn-primary w-full justify-center py-4 text-base"
                  >
                    Proceed to Checkout <ArrowRight size={18} />
                  </Link>
                ) : (
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      id="cart-login-to-checkout-btn"
                      className="btn-primary w-full justify-center py-4 text-base"
                    >
                      Sign In to Checkout
                    </Link>
                    <Link
                      to="/register"
                      id="cart-register-btn"
                      className="btn-secondary w-full justify-center py-3 text-sm"
                    >
                      Create Account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
