import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_DATA: { category: string; items: FAQItem[] }[] = [
  {
    category: 'Products & Quality',
    items: [
      {
        q: 'Are your pearls natural or cultured?',
        a: 'We carry both natural and cultured pearls, as well as semi-precious stones and high-quality imitation beads. Every product listing clearly states the type, so you always know what you are buying.',
      },
      {
        q: 'How do I know the quality of the beads?',
        a: 'All our products include detailed variant attributes — size in mm, finish, material type, and colour. High-resolution images are provided so you can inspect the product before purchasing.',
      },
      {
        q: 'Can I request a sample before placing a bulk order?',
        a: 'Yes! Please raise an enquiry through your account or contact us directly. We can arrange sample packs for bulk buyers at a nominal cost.',
      },
      {
        q: 'Do you offer custom colour or size combinations?',
        a: 'Absolutely. For custom orders, please submit an enquiry with your requirements. Our team will respond within 1–2 business days with availability and pricing.',
      },
    ],
  },
  {
    category: 'Orders & Shipping',
    items: [
      {
        q: 'How long does delivery take?',
        a: 'Standard delivery within India takes 5–8 business days. Express options are available at checkout. International shipping is available — estimated timelines vary by destination.',
      },
      {
        q: 'How do I track my order?',
        a: 'Once your order is shipped, you will receive an email with the tracking number. You can also view tracking details in My Orders → Order Detail.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Yes, we ship to most countries. International shipping charges and estimated timelines are calculated at checkout based on your delivery address.',
      },
      {
        q: 'What if my order arrives damaged?',
        a: 'Please contact us within 48 hours of delivery with photos of the damaged items. We will arrange a replacement or full refund promptly.',
      },
    ],
  },
  {
    category: 'Returns & Refunds',
    items: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns within 7 days of delivery for items that are unused and in their original packaging. Custom orders are non-returnable unless defective.',
      },
      {
        q: 'How do I initiate a return?',
        a: 'Log into your account, go to My Orders, select the order, and raise a return request. Our support team will guide you through the process.',
      },
      {
        q: 'When will I receive my refund?',
        a: 'Refunds are processed within 5–7 business days after we receive and inspect the returned items. The amount will be credited to your original payment method.',
      },
    ],
  },
  {
    category: 'Wholesale & Bulk',
    items: [
      {
        q: 'Do you offer wholesale pricing?',
        a: 'Yes! We offer tiered pricing for bulk purchases. Please sign up for a business account or submit a bulk enquiry through the Enquiries section.',
      },
      {
        q: 'Is there a minimum order quantity for wholesale?',
        a: 'Minimum quantities vary by product. Typically, bulk pricing starts from 500 grams or 10 strands. Contact us for your specific product needs.',
      },
    ],
  },
  {
    category: 'Account & Payments',
    items: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit/debit cards, UPI, net banking, and bank transfers for large orders. All payments are secured with SSL encryption.',
      },
      {
        q: 'Can I save multiple delivery addresses?',
        a: 'Yes. In your Account settings, you can add and manage multiple saved addresses for quick checkout.',
      },
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot Password" on the login page. You will receive a password-reset link on your registered email within a few minutes.',
      },
    ],
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-navy-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left py-4 flex items-start justify-between gap-4 group"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-midnight-navy group-hover:text-champagne-gold transition-colors leading-snug">
          {item.q}
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-charcoal/40 transition-transform duration-300 mt-0.5 ${open ? 'rotate-180 text-champagne-gold' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-charcoal/70 pb-4 leading-relaxed">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  const [search, setSearch] = useState('');

  const filtered = FAQ_DATA
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          !search ||
          item.q.toLowerCase().includes(search.toLowerCase()) ||
          item.a.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="bg-pearl-ivory min-h-screen">
      {/* Hero */}
      <section className="bg-midnight-navy text-white py-16 px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
            Quick answers to common questions about our products and services.
          </p>
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40 pointer-events-none"
            />
            <input
              id="faq-search"
              className="w-full pl-10 pr-4 py-3 rounded-xl border-0 bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-champagne-gold text-sm backdrop-blur"
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </motion.div>
      </section>

      <div className="page-container py-16">
        <div className="max-w-3xl mx-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-charcoal/60 py-12">
              No results found for "{search}"
            </p>
          ) : (
            <div className="space-y-8">
              {filtered.map((cat, i) => (
                <motion.div
                  key={cat.category}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card p-6"
                >
                  <h2 className="font-display text-lg text-midnight-navy font-semibold mb-2">
                    {cat.category}
                  </h2>
                  <div className="divider-gold !mx-0 !w-12 mb-4" />
                  {cat.items.map((item) => (
                    <FAQAccordion key={item.q} item={item} />
                  ))}
                </motion.div>
              ))}
            </div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12 text-center card p-8"
          >
            <h3 className="font-display text-xl text-midnight-navy font-semibold mb-2">
              Still have questions?
            </h3>
            <p className="text-charcoal/60 text-sm mb-6">
              Our team is happy to help — reach out anytime.
            </p>
            <a href="/contact" id="faq-contact-link" className="btn-primary px-8 py-3">
              Contact Us
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
