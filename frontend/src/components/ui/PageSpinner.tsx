import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  className?: string;
}

export default function PageSpinner({ className = '' }: Props) {
  return (
    <div className={`flex items-center justify-center min-h-[60vh] ${className}`} role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-12 h-12 rounded-full border-4 border-gold-200 border-t-champagne-gold"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
        <p className="text-sm text-charcoal/60 font-medium">Loading…</p>
      </div>
    </div>
  );
}
