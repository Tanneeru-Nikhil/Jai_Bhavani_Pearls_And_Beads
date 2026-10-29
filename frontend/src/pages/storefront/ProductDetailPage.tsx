import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Heart, ShoppingCart, Minus, Plus, Share2, ChevronRight, Shield, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Product, ProductVariant } from '@/types';
import { formatCurrency, getStockStatus } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import PageSpinner from '@/components/ui/PageSpinner';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const queryClient = useQueryClient();

  const { data: product, isLoading, isError } = useQuery<Product>({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data } = await api.get<Product>(`/products/${slug}`);
      return data;
    },
    enabled: !!slug,
  });

  const selectedVariant: ProductVariant | undefined = product?.variants.find(
    (v) => v.id === selectedVariantId
  ) ?? product?.variants[0];

  const stockStatus = getStockStatus(selectedVariant?.available_quantity ?? 0);

  const wishlistMutation = useMutation({
    mutationFn: (variantId: string) => api.post('/wishlist', { variant_id: variantId }),
    onSuccess: () => toast.success('Added to wishlist'),
    onError: () => toast.error('Please sign in to save items'),
  });

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error('Please select a variant');
      return;
    }
    if (!stockStatus.isAvailable) {
      toast.error('This variant is out of stock');
      return;
    }
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await addItem(selectedVariant.id, quantity);
      toast.success('Added to cart!');
    } catch {
      toast.error('Could not add to cart. Please try again.');
    }
  };

  if (isLoading) return <PageSpinner />;
  if (isError || !product) {
    return (
      <div className="page-container py-20 text-center">
        <div className="text-5xl mb-4">😔</div>
        <h1 className="font-display text-2xl text-midnight-navy mb-2">Product Not Found</h1>
        <p className="text-charcoal/60 mb-6">This product may have been removed or the link is incorrect.</p>
        <button onClick={() => navigate('/products')} className="btn-primary">Browse All Products</button>
      </div>
    );
  }

  const allImages = selectedVariant?.images.length
    ? selectedVariant.images
    : product.primary_image ? [product.primary_image] : [];

  return (
    <div className="page-container py-8 lg:py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-charcoal/60 mb-8">
        <a href="/" className="hover:text-champagne-gold transition-colors">Home</a>
        <ChevronRight size={14} />
        <a href="/products" className="hover:text-champagne-gold transition-colors">Products</a>
        <ChevronRight size={14} />
        <a href={`/categories/${product.category.slug}`} className="hover:text-champagne-gold transition-colors">{product.category.name}</a>
        <ChevronRight size={14} />
        <span className="text-midnight-navy font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 xl:gap-16">
        {/* Image Gallery */}
        <div>
          {/* Main image */}
          <div className="relative rounded-2xl overflow-hidden bg-ivory-100 aspect-square mb-4">
            {allImages[selectedImageIdx] ? (
              <img
                src={allImages[selectedImageIdx].url}
                alt={allImages[selectedImageIdx].alt_text || product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl opacity-30">💎</div>
            )}
          </div>
          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-3 flex-wrap">
              {allImages.map((img, i) => (
                <button
                  key={img.id}
                  id={`img-thumb-${i}`}
                  onClick={() => setSelectedImageIdx(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    i === selectedImageIdx ? 'border-champagne-gold' : 'border-transparent hover:border-gold-300'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <p className="badge-gold mb-3">{product.category.name}</p>
          <h1 className="font-display text-3xl lg:text-4xl text-midnight-navy font-semibold mb-3">
            {product.name}
          </h1>

          {/* Rating */}
          {product.review_count > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} className={i < Math.round(product.average_rating) ? 'star-filled fill-current' : 'star-empty fill-current'} />
                ))}
              </div>
              <span className="text-sm text-charcoal/60">{product.average_rating.toFixed(1)} ({product.review_count} reviews)</span>
            </div>
          )}

          {/* Price */}
          <div className="text-3xl font-display font-semibold text-midnight-navy mb-6">
            {selectedVariant ? formatCurrency(selectedVariant.price, selectedVariant.currency) : (
              <span>
                {formatCurrency(Math.min(...product.variants.map((v) => v.price)))}
                {product.variants.length > 1 && (
                  <span className="text-lg font-normal text-charcoal/50 ml-2">
                    – {formatCurrency(Math.max(...product.variants.map((v) => v.price)))}
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Variant selection */}
          {product.variants.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-midnight-navy mb-3">
                Select Variant{selectedVariant && `: ${selectedVariant.color || selectedVariant.size_mm ? `${selectedVariant.color ?? ''} ${selectedVariant.size_mm ? `${selectedVariant.size_mm}mm` : ''}`.trim() : selectedVariant.sku}`}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    id={`variant-${v.id}`}
                    onClick={() => { setSelectedVariantId(v.id); setSelectedImageIdx(0); }}
                    aria-pressed={selectedVariant?.id === v.id}
                    disabled={!v.is_active || v.available_quantity <= 0}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-champagne-gold bg-gold-50 text-midnight-navy'
                        : v.available_quantity <= 0
                        ? 'border-gray-200 text-gray-400 line-through cursor-not-allowed'
                        : 'border-navy-200 text-charcoal hover:border-champagne-gold hover:bg-gold-50'
                    }`}
                  >
                    {v.color || v.size_mm ? `${v.color ?? ''} ${v.size_mm ? `${v.size_mm}mm` : ''}`.trim() : v.sku}
                    {v.available_quantity <= 0 && ' (Out)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock status */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-6 ${
            stockStatus.isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${stockStatus.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
            {stockStatus.label}
          </div>

          {/* Quantity */}
          {stockStatus.isAvailable && (
            <div className="flex items-center gap-4 mb-6">
              <p className="text-sm font-semibold text-midnight-navy">Quantity:</p>
              <div className="flex items-center gap-2">
                <button
                  id="qty-decrease-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                  className="qty-btn"
                >
                  <Minus size={16} />
                </button>
                <span id="qty-display" className="w-12 text-center font-semibold text-midnight-navy">{quantity}</span>
                <button
                  id="qty-increase-btn"
                  onClick={() => setQuantity(Math.min(selectedVariant?.available_quantity ?? 1, quantity + 1))}
                  aria-label="Increase quantity"
                  className="qty-btn"
                >
                  <Plus size={16} />
                </button>
              </div>
              {selectedVariant && (
                <span className="text-xs text-charcoal/50">per {selectedVariant.sale_unit}</span>
              )}
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3 mb-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="add-to-cart-btn"
              onClick={handleAddToCart}
              disabled={!stockStatus.isAvailable}
              className={`flex-1 btn-primary py-4 text-base ${!stockStatus.isAvailable && 'opacity-50 cursor-not-allowed'}`}
            >
              <ShoppingCart size={20} />
              {stockStatus.isAvailable ? 'Add to Cart' : 'Out of Stock'}
            </motion.button>
            <button
              id="wishlist-btn"
              onClick={() => selectedVariant && wishlistMutation.mutate(selectedVariant.id)}
              aria-label="Add to wishlist"
              className="p-4 rounded-xl border-2 border-navy-200 text-midnight-navy hover:border-red-400 hover:text-red-500 transition-all"
            >
              <Heart size={20} />
            </button>
          </div>

          {/* Product attributes */}
          <div className="card p-5 mb-6">
            <h3 className="font-semibold text-midnight-navy mb-4">Product Details</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {product.shape && (
                <>
                  <dt className="text-charcoal/60">Shape</dt>
                  <dd className="text-charcoal font-medium">{product.shape}</dd>
                </>
              )}
              {product.material && (
                <>
                  <dt className="text-charcoal/60">Material</dt>
                  <dd className="text-charcoal font-medium">{product.material}</dd>
                </>
              )}
              {selectedVariant?.size_mm && (
                <>
                  <dt className="text-charcoal/60">Size</dt>
                  <dd className="text-charcoal font-medium">{selectedVariant.size_mm}mm</dd>
                </>
              )}
              {selectedVariant?.hole_diameter_mm && (
                <>
                  <dt className="text-charcoal/60">Hole Diameter</dt>
                  <dd className="text-charcoal font-medium">{selectedVariant.hole_diameter_mm}mm</dd>
                </>
              )}
              {selectedVariant?.sku && (
                <>
                  <dt className="text-charcoal/60">SKU</dt>
                  <dd className="text-charcoal font-medium font-mono">{selectedVariant.sku}</dd>
                </>
              )}
              {selectedVariant?.sale_unit && (
                <>
                  <dt className="text-charcoal/60">Sold Per</dt>
                  <dd className="text-charcoal font-medium capitalize">{selectedVariant.sale_unit}{selectedVariant.pack_quantity ? ` (${selectedVariant.pack_quantity} pcs)` : ''}</dd>
                </>
              )}
              {product.origin && (
                <>
                  <dt className="text-charcoal/60">Origin</dt>
                  <dd className="text-charcoal font-medium">{product.origin}</dd>
                </>
              )}
            </dl>
            {product.quality_notes && (
              <p className="text-xs text-charcoal/60 mt-3 pt-3 border-t border-gold-100 italic">
                ℹ️ {product.quality_notes}
              </p>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-xs text-charcoal/70">
              <Shield size={14} className="text-champagne-gold" />
              Genuine quality guarantee
            </div>
            <div className="flex items-center gap-2 text-xs text-charcoal/70">
              <Truck size={14} className="text-champagne-gold" />
              Pan-India shipping
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="mt-12 lg:mt-16" aria-labelledby="description-heading">
        <h2 id="description-heading" className="font-display text-2xl text-midnight-navy font-semibold mb-4">Description</h2>
        <div className="divider-gold mb-6 ml-0" />
        <div className="prose max-w-none text-charcoal/80 leading-relaxed whitespace-pre-line">
          {product.description}
        </div>
      </section>
    </div>
  );
}
