import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import type { Category, ProductListItem, PaginatedResponse } from '@/types';
import ProductCard from '@/components/products/ProductCard';
import PageSpinner from '@/components/ui/PageSpinner';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: category, isLoading: catLoading } = useQuery<Category>({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data } = await api.get<Category>(`/categories/${slug}`);
      return data;
    },
    enabled: !!slug,
  });

  const { data: products, isLoading: prodLoading } = useQuery<PaginatedResponse<ProductListItem>>({
    queryKey: ['products', 'category', slug],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductListItem>>('/products', {
        params: { category: slug, size: 24 },
      });
      return data;
    },
    enabled: !!slug,
  });

  if (catLoading || prodLoading) return <PageSpinner />;

  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-gradient-navy py-16 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #D7B15D 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div className="relative page-container">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-pearl-ivory/60 text-sm mb-6">
            <Link to="/" className="hover:text-champagne-gold transition-colors">Home</Link>
            <ChevronRight size={14} />
            <Link to="/products" className="hover:text-champagne-gold transition-colors">Products</Link>
            <ChevronRight size={14} />
            <span className="text-pearl-ivory">{category?.name ?? slug}</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-4xl md:text-5xl text-pearl-ivory font-semibold mb-4">
              {category?.name ?? 'Category'}
            </h1>
            {category?.description && (
              <p className="text-pearl-ivory/70 text-lg max-w-2xl">{category.description}</p>
            )}
            {products && (
              <p className="text-champagne-gold/80 text-sm mt-4 font-medium">
                {products.total} product{products.total !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 bg-pearl-ivory">
        <div className="page-container">
          {products?.items.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="font-semibold text-midnight-navy text-xl mb-2">No products found</h2>
              <p className="text-charcoal/60 mb-6">This category doesn't have any products yet.</p>
              <Link to="/products" id="cat-browse-all-btn" className="btn-primary">
                Browse All Products <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6"
            >
              {products?.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
