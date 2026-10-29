import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingCart, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ProductListItem } from '@/types';
import { formatCurrency, getStockStatus } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';

interface Props {
  product: ProductListItem;
}

export default function ProductCard({ product }: Props) {
  const { addItem } = useCart();
  const stockStatus = getStockStatus(product.is_in_stock ? 10 : 0);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Use first available variant; actual selection happens on product detail page
    toast.error('Please select a variant on the product page');
  };

  const priceDisplay = product.min_price === product.max_price
    ? formatCurrency(product.min_price, product.currency)
    : `${formatCurrency(product.min_price, product.currency)} – ${formatCurrency(product.max_price, product.currency)}`;

  return (
    <Link
      to={`/products/${product.slug}`}
      id={`product-card-${product.id}`}
      className="group card block"
      aria-label={`${product.name}, ${priceDisplay}`}
    >
      {/* Image */}
      <div className="product-image-container">
        {product.primary_image ? (
          <img
            src={product.primary_image.url}
            alt={product.primary_image.alt_text || product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-pearl flex items-center justify-center">
            <span className="text-5xl opacity-50">💎</span>
          </div>
        )}

        {/* Overlay actions */}
        <div className="absolute inset-0 bg-midnight-navy/0 group-hover:bg-midnight-navy/20 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddToCart}
            id={`add-to-cart-${product.id}`}
            aria-label={`Add ${product.name} to cart`}
            className="p-3 rounded-full bg-white text-midnight-navy shadow-lg hover:bg-champagne-gold hover:text-white transition-all"
          >
            <ShoppingCart size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => e.preventDefault()}
            id={`wishlist-${product.id}`}
            aria-label={`Add ${product.name} to wishlist`}
            className="p-3 rounded-full bg-white text-midnight-navy shadow-lg hover:bg-red-500 hover:text-white transition-all"
          >
            <Heart size={18} />
          </motion.button>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {!product.is_in_stock && (
            <span className="badge-navy text-[10px]">Out of Stock</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-[10px] font-semibold text-champagne-gold uppercase tracking-widest mb-1">
          {product.category.name}
        </p>
        <h3 className="font-medium text-midnight-navy text-sm leading-snug line-clamp-2 mb-2 group-hover:text-champagne-gold transition-colors">
          {product.name}
        </h3>
        {product.review_count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  className={i < Math.round(product.average_rating) ? 'star-filled fill-current' : 'star-empty fill-current'}
                />
              ))}
            </div>
            <span className="text-[10px] text-charcoal/60">({product.review_count})</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-midnight-navy text-sm">{priceDisplay}</span>
          <span className={`text-[10px] font-medium ${stockStatus.color}`}>
            {stockStatus.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
