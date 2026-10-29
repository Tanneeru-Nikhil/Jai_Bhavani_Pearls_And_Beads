import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';

const footerLinks = {
  shop: [
    { label: 'All Products', to: '/products' },
    { label: 'Pearls', to: '/categories/pearls' },
    { label: 'Gemstone Beads', to: '/categories/gemstone-beads' },
    { label: 'Seed Beads', to: '/categories/seed-beads' },
    { label: 'Metal Findings', to: '/categories/metal-findings' },
  ],
  account: [
    { label: 'My Account', to: '/account' },
    { label: 'My Orders', to: '/account/orders' },
    { label: 'Wishlist', to: '/account/wishlist' },
    { label: 'Enquiries', to: '/enquiries' },
  ],
  support: [
    { label: 'FAQ', to: '/faq' },
    { label: 'Contact Us', to: '/contact' },
    { label: 'Shipping Policy', to: '/shipping' },
    { label: 'Returns & Refunds', to: '/returns' },
  ],
  legal: [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-midnight-navy text-pearl-ivory" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      {/* Main footer */}
      <div className="page-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6" aria-label="Jai Bhavani Pearls & Beads home">
              <img
                src="/brand/jai-bhavani-logo.jpg"
                alt="Jai Bhavani Pearls & Beads logo"
                className="h-14 w-14 rounded-full object-cover ring-2 ring-champagne-gold/40"
              />
              <div>
                <div className="font-display text-xl font-semibold text-pearl-ivory">Jai Bhavani</div>
                <div className="text-xs font-medium tracking-widest text-champagne-gold uppercase">Pearls & Beads</div>
              </div>
            </Link>
            <p className="text-sm text-pearl-ivory/70 leading-relaxed max-w-xs mb-6">
              Premium beads, pearls and jewellery-making supplies. Crafting excellence for artisans and designers across India.
            </p>
            {/* Contact */}
            <div className="flex flex-col gap-3">
              <a href="mailto:info@jaibhavanipearls.com" className="flex items-center gap-2 text-sm text-pearl-ivory/70 hover:text-champagne-gold transition-colors">
                <Mail size={16} className="text-champagne-gold flex-shrink-0" />
                info@jaibhavanipearls.com
              </a>
              <a href="tel:+919876543210" className="flex items-center gap-2 text-sm text-pearl-ivory/70 hover:text-champagne-gold transition-colors">
                <Phone size={16} className="text-champagne-gold flex-shrink-0" />
                +91 98765 43210
              </a>
              <p className="flex items-start gap-2 text-sm text-pearl-ivory/70">
                <MapPin size={16} className="text-champagne-gold flex-shrink-0 mt-0.5" />
                Jewellery Market, Mumbai, Maharashtra, India
              </p>
            </div>
            {/* Social */}
            <div className="flex items-center gap-3 mt-6">
              <a href="#" aria-label="Instagram" className="p-2 rounded-lg border border-pearl-ivory/20 text-pearl-ivory/70 hover:border-champagne-gold hover:text-champagne-gold transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" aria-label="Facebook" className="p-2 rounded-lg border border-pearl-ivory/20 text-pearl-ivory/70 hover:border-champagne-gold hover:text-champagne-gold transition-all">
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-pearl-ivory uppercase tracking-wider mb-4">Shop</h3>
            <ul className="flex flex-col gap-3">
              {footerLinks.shop.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-pearl-ivory/70 hover:text-champagne-gold transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-pearl-ivory uppercase tracking-wider mb-4">Account</h3>
            <ul className="flex flex-col gap-3">
              {footerLinks.account.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-pearl-ivory/70 hover:text-champagne-gold transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="text-sm font-semibold text-pearl-ivory uppercase tracking-wider mb-4 mt-6">Support</h3>
            <ul className="flex flex-col gap-3">
              {footerLinks.support.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-pearl-ivory/70 hover:text-champagne-gold transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-sm font-semibold text-pearl-ivory uppercase tracking-wider mb-4">Newsletter</h3>
            <p className="text-sm text-pearl-ivory/70 mb-4 leading-relaxed">
              Subscribe for new arrivals, exclusive offers and jewellery inspiration.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col gap-3"
              aria-label="Newsletter subscription"
            >
              <input
                id="newsletter-email"
                type="email"
                placeholder="Your email address"
                className="input-field bg-royal-navy border-pearl-ivory/20 text-pearl-ivory placeholder-pearl-ivory/40 focus:border-champagne-gold"
                aria-label="Email address for newsletter"
              />
              <button type="submit" className="btn-primary w-full justify-center">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-pearl-ivory/10">
        <div className="page-container py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-pearl-ivory/50">
            © {new Date().getFullYear()} Jai Bhavani Pearls & Beads. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {footerLinks.legal.map((link) => (
              <Link key={link.to} to={link.to} className="text-xs text-pearl-ivory/50 hover:text-champagne-gold transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
          {/* Payment icons */}
          <div className="flex items-center gap-2">
            {['Visa', 'MC', 'UPI', 'RazorPay'].map((p) => (
              <span key={p} className="px-2 py-1 rounded border border-pearl-ivory/20 text-[10px] text-pearl-ivory/50 font-medium">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
