import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Sparkles, Gem, Package, Shield, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ProductListItem, Category } from '@/types';
import { formatCurrency } from '@/lib/utils';
import ProductCard from '@/components/products/ProductCard';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const stagger = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true },
};

const categories = [
  { name: 'Freshwater Pearls', slug: 'pearls', emoji: '🤍', desc: 'Natural & cultured pearls' },
  { name: 'Gemstone Beads', slug: 'gemstone-beads', emoji: '💎', desc: 'Semi-precious stones' },
  { name: 'Seed Beads', slug: 'seed-beads', emoji: '✨', desc: 'Delica, rocailles & more' },
  { name: 'Crystal Beads', slug: 'crystal-beads', emoji: '🔮', desc: 'Sparkling crystal cuts' },
  { name: 'Metal Findings', slug: 'metal-findings', emoji: '⚙️', desc: 'Clasps, crimps & rings' },
  { name: 'Stringing', slug: 'stringing-materials', emoji: '🧵', desc: 'Thread, wire & cord' },
];

const trustSignals = [
  { icon: Shield, title: 'Authentic Quality', desc: 'Every product verified and accurately described' },
  { icon: Truck, title: 'Pan-India Shipping', desc: 'Fast, tracked delivery across India' },
  { icon: Package, title: 'Secure Packaging', desc: 'Bead-safe packaging prevents transit damage' },
  { icon: Star, title: 'Premium Selection', desc: 'Curated catalogue for artisans and designers' },
];

export default function HomePage() {
  const { data: featuredProducts } = useQuery<ProductListItem[]>({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data } = await api.get<{ items: ProductListItem[] }>('/products?sort=rating_desc&size=8');
      return data.items;
    },
  });

  return (
    <div className="overflow-x-hidden">
      {/* ── Hero Section ── */}
      <section className="relative min-h-[85vh] flex items-center" aria-label="Hero">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-navy" />
        {/* Decorative circles */}
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-champagne-gold/10 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-champagne-gold/8 blur-2xl" />
        {/* Pearl dots pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, #D7B15D 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div className="relative page-container py-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-champagne-gold/30 bg-champagne-gold/10 mb-6">
              <Sparkles size={14} className="text-champagne-gold" />
              <span className="text-xs font-semibold text-champagne-gold uppercase tracking-widest">Premium Jewellery Supplies</span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold text-pearl-ivory leading-tight mb-6">
              Craft with{' '}
              <span className="text-gold-shimmer">Timeless</span>
              <br />Elegance
            </h1>
            <p className="text-pearl-ivory/75 text-lg leading-relaxed mb-8 max-w-lg">
              Discover India's finest collection of natural pearls, gemstone beads, and jewellery-making supplies — curated for artisans who demand quality.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products" id="hero-shop-btn" className="btn-primary text-base px-8 py-4">
                Shop Collection <ArrowRight size={18} />
              </Link>
              <Link to="/contact" id="hero-enquiry-btn" className="btn-secondary text-base px-8 py-4">
                Custom Enquiry
              </Link>
            </div>
            {/* Social proof */}
            <div className="flex items-center gap-6 mt-10 pt-8 border-t border-pearl-ivory/10">
              {[
                { value: '5,000+', label: 'Products' },
                { value: '10,000+', label: 'Happy Customers' },
                { value: '4.9★', label: 'Average Rating' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-display font-semibold text-champagne-gold">{stat.value}</div>
                  <div className="text-xs text-pearl-ivory/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Logo showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-champagne-gold/30"
                style={{ margin: '-20px' }}
              />
              <div className="w-72 h-72 rounded-full overflow-hidden ring-4 ring-champagne-gold/40 ring-offset-4 ring-offset-midnight-navy shadow-gold-lg">
                <img
                  src="/brand/jai-bhavani-logo.jpg"
                  alt="Jai Bhavani Pearls & Beads"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating badges */}
              <motion.div
                animate={{ y: [-6, 6, -6] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 glass-dark rounded-2xl px-4 py-3 shadow-gold"
              >
                <div className="flex items-center gap-2">
                  <Gem size={16} className="text-champagne-gold" />
                  <span className="text-xs font-semibold text-pearl-ivory">Genuine Gems</span>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [6, -6, 6] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-4 -left-4 glass-dark rounded-2xl px-4 py-3 shadow-gold"
              >
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-champagne-gold fill-champagne-gold" />
                  <span className="text-xs font-semibold text-pearl-ivory">4.9/5 Rated</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 20C1200 80 720 0 0 60V80Z" fill="#FFF9EE" />
          </svg>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="py-20 bg-pearl-ivory" aria-labelledby="categories-heading">
        <div className="page-container">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 id="categories-heading" className="section-title">Shop by Category</h2>
            <div className="divider-gold mb-4" />
            <p className="section-subtitle">
              Explore our curated collection of premium beading supplies
            </p>
          </motion.div>

          <motion.div
            {...stagger}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {categories.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/categories/${cat.slug}`}
                  id={`category-${cat.slug}`}
                  className="group flex flex-col items-center p-6 rounded-2xl bg-white hover:bg-gradient-navy transition-all duration-300 shadow-card hover:shadow-gold text-center"
                >
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    {cat.emoji}
                  </span>
                  <h3 className="text-sm font-semibold text-midnight-navy group-hover:text-champagne-gold transition-colors leading-tight">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-charcoal/60 group-hover:text-pearl-ivory/70 transition-colors mt-1">
                    {cat.desc}
                  </p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="py-20 bg-ivory-100" aria-labelledby="featured-heading">
        <div className="page-container">
          <motion.div {...fadeUp} className="flex items-end justify-between mb-12">
            <div>
              <h2 id="featured-heading" className="section-title text-left mb-2">Featured Products</h2>
              <div className="w-16 h-0.5 bg-gradient-gold" />
            </div>
            <Link to="/products?sort=rating_desc" className="btn-secondary text-sm px-5 py-2.5 hidden sm:flex items-center gap-2">
              View All <ArrowRight size={16} />
            </Link>
          </motion.div>

          {featuredProducts ? (
            <motion.div
              {...stagger}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6"
            >
              {featuredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="skeleton aspect-square" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 rounded w-3/4" />
                    <div className="skeleton h-3 rounded w-1/2" />
                    <div className="skeleton h-5 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-10 sm:hidden">
            <Link to="/products" className="btn-navy inline-flex items-center gap-2">
              View All Products <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bead Finder Banner ── */}
      <section className="py-16 bg-gradient-navy relative overflow-hidden" aria-labelledby="finder-heading">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, #D7B15D 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative page-container text-center">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-champagne-gold/30 bg-champagne-gold/10 mb-6">
              <Sparkles size={14} className="text-champagne-gold" />
              <span className="text-xs font-semibold text-champagne-gold uppercase tracking-widest">Smart Tool</span>
            </div>
            <h2 id="finder-heading" className="font-display text-4xl md:text-5xl text-pearl-ivory font-semibold mb-4">
              Bead & Pearl Finder
            </h2>
            <p className="text-pearl-ivory/70 text-lg max-w-2xl mx-auto mb-8">
              Find the perfect bead by material, color, size, shape, and finish. Our smart filter helps you discover exactly what your project needs.
            </p>
            <Link to="/products" id="bead-finder-btn" className="btn-primary text-base px-8 py-4">
              Launch Finder <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Trust Signals ── */}
      <section className="py-16 bg-pearl-ivory" aria-labelledby="trust-heading">
        <div className="page-container">
          <h2 id="trust-heading" className="sr-only">Why choose Jai Bhavani</h2>
          <motion.div
            {...stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {trustSignals.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card p-6 text-center group hover:scale-[1.02] transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-gold-50 flex items-center justify-center mx-auto mb-4 group-hover:bg-gradient-navy transition-colors">
                  <item.icon size={24} className="text-champagne-gold" />
                </div>
                <h3 className="font-semibold text-midnight-navy mb-2">{item.title}</h3>
                <p className="text-sm text-charcoal/70 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Jewellery Calculator CTA ── */}
      <section className="py-16 bg-ivory-100" aria-labelledby="calc-heading">
        <div className="page-container">
          <motion.div
            {...fadeUp}
            className="card-premium p-10 lg:p-14 flex flex-col lg:flex-row items-center gap-10"
          >
            <div className="flex-1">
              <div className="badge-gold mb-4">Free Tool</div>
              <h2 id="calc-heading" className="font-display text-3xl lg:text-4xl text-midnight-navy font-semibold mb-4">
                Jewellery Project Calculator
              </h2>
              <p className="text-charcoal/70 leading-relaxed mb-6">
                Estimate the number of beads and total material cost for your project. Enter your design length, bead diameter, and spacing to get an instant estimate.
              </p>
              <Link to="/products#calculator" id="calculator-cta-btn" className="btn-primary">
                Try Calculator <ArrowRight size={18} />
              </Link>
            </div>
            <div className="flex-shrink-0 w-48 h-48 rounded-2xl bg-gradient-navy flex items-center justify-center shadow-gold">
              <div className="text-center">
                <div className="text-5xl mb-2">🧮</div>
                <div className="text-pearl-ivory text-sm font-semibold">Instant Estimate</div>
                <div className="text-champagne-gold text-xs mt-1">No signup needed</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
