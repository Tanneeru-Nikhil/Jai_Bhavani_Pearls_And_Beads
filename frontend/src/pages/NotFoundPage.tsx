import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-pearl-ivory flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg"
      >
        {/* Decorative gem */}
        <div className="text-8xl mb-6">💎</div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-champagne-gold/30 bg-champagne-gold/10 mb-6">
          <span className="text-xs font-semibold text-champagne-gold uppercase tracking-widest">404 Not Found</span>
        </div>

        <h1 className="font-display text-5xl text-midnight-navy font-semibold mb-4">
          Page Not Found
        </h1>
        <p className="text-charcoal/70 text-lg leading-relaxed mb-10">
          The page you're looking for seems to have gone missing. Perhaps it was moved, renamed, or never existed.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" id="not-found-home-btn" className="btn-primary px-8 py-4 text-base">
            <Home size={18} /> Go Home
          </Link>
          <Link to="/products" id="not-found-products-btn" className="btn-secondary px-8 py-4 text-base">
            <Search size={18} /> Browse Products
          </Link>
        </div>

        <button
          onClick={() => window.history.back()}
          id="not-found-back-btn"
          className="mt-6 flex items-center gap-2 text-sm text-charcoal/60 hover:text-champagne-gold transition-colors mx-auto"
        >
          <ArrowLeft size={16} /> Go back
        </button>
      </motion.div>
    </div>
  );
}
