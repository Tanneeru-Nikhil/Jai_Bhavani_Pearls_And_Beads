import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Heart, Search, User, Menu, X, ChevronDown,
  Package, LogOut, Settings, ClipboardList
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

const categories = [
  { name: 'Pearls', slug: 'pearls' },
  { name: 'Gemstone Beads', slug: 'gemstone-beads' },
  { name: 'Seed Beads', slug: 'seed-beads' },
  { name: 'Crystal Beads', slug: 'crystal-beads' },
  { name: 'Metal Findings', slug: 'metal-findings' },
  { name: 'Stringing Materials', slug: 'stringing-materials' },
  { name: 'Tools & Accessories', slug: 'tools-accessories' },
];

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-midnight-navy text-pearl-ivory text-center py-2 px-4 text-xs font-medium">
        ✨ Free shipping on orders above ₹999 &nbsp;|&nbsp; Premium quality guaranteed
      </div>

      <header
        className={cn(
          'sticky top-0 z-50 transition-all duration-300',
          isScrolled
            ? 'glass border-b border-gold-200 shadow-gold'
            : 'bg-pearl-ivory border-b border-gold-100'
        )}
      >
        <div className="page-container">
          <div className="flex items-center h-16 lg:h-20 gap-4">
            {/* Mobile menu button */}
            <button
              id="mobile-menu-btn"
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-lg text-midnight-navy hover:bg-gold-50 transition-colors"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
              {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 flex-shrink-0" aria-label="Jai Bhavani Pearls & Beads home">
              <img
                src="/brand/jai-bhavani-logo.jpg"
                alt="Jai Bhavani Pearls & Beads logo"
                className="h-10 w-10 lg:h-12 lg:w-12 rounded-full object-cover ring-2 ring-champagne-gold/30"
              />
              <div className="hidden sm:block">
                <div className="font-display text-base lg:text-lg font-semibold text-midnight-navy leading-none">
                  Jai Bhavani
                </div>
                <div className="text-xs font-medium tracking-widest text-champagne-gold uppercase">
                  Pearls & Beads
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 ml-6 flex-1" aria-label="Main navigation">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  cn('nav-link px-3 py-2 rounded-lg text-midnight-navy hover:text-champagne-gold hover:bg-gold-50 transition-all',
                    isActive && 'text-champagne-gold font-semibold')
                }
              >
                Home
              </NavLink>

              {/* Categories dropdown */}
              <div className="relative" onMouseLeave={() => setIsCategoryMenuOpen(false)}>
                <button
                  onMouseEnter={() => setIsCategoryMenuOpen(true)}
                  className="nav-link flex items-center gap-1 px-3 py-2 rounded-lg text-midnight-navy hover:text-champagne-gold hover:bg-gold-50 transition-all"
                  id="categories-menu-btn"
                  aria-haspopup="true"
                  aria-expanded={isCategoryMenuOpen}
                >
                  Categories <ChevronDown size={16} className={cn('transition-transform', isCategoryMenuOpen && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {isCategoryMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 w-52 bg-white rounded-2xl shadow-card-hover border border-gold-100 overflow-hidden z-50"
                      role="menu"
                    >
                      {categories.map((cat) => (
                        <Link
                          key={cat.slug}
                          to={`/categories/${cat.slug}`}
                          className="flex items-center px-4 py-3 text-sm text-charcoal hover:bg-gold-50 hover:text-champagne-gold transition-colors"
                          role="menuitem"
                          onClick={() => setIsCategoryMenuOpen(false)}
                        >
                          {cat.name}
                        </Link>
                      ))}
                      <Link
                        to="/products"
                        className="flex items-center px-4 py-3 text-sm font-semibold text-champagne-gold border-t border-gold-100 hover:bg-gold-50 transition-colors"
                        role="menuitem"
                        onClick={() => setIsCategoryMenuOpen(false)}
                      >
                        View All Products →
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <NavLink
                to="/products"
                className={({ isActive }) =>
                  cn('nav-link px-3 py-2 rounded-lg text-midnight-navy hover:text-champagne-gold hover:bg-gold-50 transition-all',
                    isActive && 'text-champagne-gold font-semibold')
                }
              >
                Shop
              </NavLink>
              <NavLink
                to="/contact"
                className={({ isActive }) =>
                  cn('nav-link px-3 py-2 rounded-lg text-midnight-navy hover:text-champagne-gold hover:bg-gold-50 transition-all',
                    isActive && 'text-champagne-gold font-semibold')
                }
              >
                Contact
              </NavLink>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Search */}
              <button
                id="search-btn"
                aria-label="Search products"
                className="p-2 rounded-lg text-midnight-navy hover:bg-gold-50 hover:text-champagne-gold transition-all"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search size={20} />
              </button>

              {/* Wishlist */}
              {isAuthenticated && (
                <Link
                  to="/account/wishlist"
                  id="wishlist-link"
                  aria-label="My wishlist"
                  className="p-2 rounded-lg text-midnight-navy hover:bg-gold-50 hover:text-champagne-gold transition-all"
                >
                  <Heart size={20} />
                </Link>
              )}

              {/* Cart */}
              <Link
                to="/cart"
                id="cart-link"
                aria-label={`Shopping cart, ${itemCount} items`}
                className="relative p-2 rounded-lg text-midnight-navy hover:bg-gold-50 hover:text-champagne-gold transition-all"
              >
                <ShoppingCart size={20} />
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-champagne-gold text-midnight-navy text-[10px] font-bold flex items-center justify-center px-1"
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </motion.span>
                )}
              </Link>

              {/* User menu */}
              {isAuthenticated ? (
                <div className="relative" onMouseLeave={() => setIsUserMenuOpen(false)}>
                  <button
                    onMouseEnter={() => setIsUserMenuOpen(true)}
                    id="user-menu-btn"
                    aria-label="User menu"
                    aria-haspopup="true"
                    aria-expanded={isUserMenuOpen}
                    className="flex items-center gap-2 p-2 rounded-lg text-midnight-navy hover:bg-gold-50 hover:text-champagne-gold transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-navy flex items-center justify-center text-white text-sm font-semibold">
                      {user?.first_name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                  </button>
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-1 w-52 bg-white rounded-2xl shadow-card-hover border border-gold-100 overflow-hidden z-50"
                        role="menu"
                      >
                        <div className="px-4 py-3 border-b border-gold-100">
                          <p className="text-sm font-semibold text-midnight-navy">{user?.first_name} {user?.last_name}</p>
                          <p className="text-xs text-charcoal/60 truncate">{user?.email}</p>
                        </div>
                        <Link to="/account" className="flex items-center gap-3 px-4 py-3 text-sm text-charcoal hover:bg-gold-50 transition-colors" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                          <Settings size={16} /> My Account
                        </Link>
                        <Link to="/account/orders" className="flex items-center gap-3 px-4 py-3 text-sm text-charcoal hover:bg-gold-50 transition-colors" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                          <Package size={16} /> Orders
                        </Link>
                        <Link to="/enquiries" className="flex items-center gap-3 px-4 py-3 text-sm text-charcoal hover:bg-gold-50 transition-colors" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                          <ClipboardList size={16} /> Enquiries
                        </Link>
                        {['admin', 'support', 'inventory'].includes(user?.role ?? '') && (
                          <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-sm text-champagne-gold font-semibold hover:bg-gold-50 transition-colors border-t border-gold-100" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                            <User size={16} /> Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          id="logout-btn"
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gold-100"
                          role="menuitem"
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/login"
                  id="login-btn"
                  className="hidden sm:flex btn-navy text-sm px-4 py-2 ml-2"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden bg-white border-t border-gold-100"
              aria-label="Mobile navigation"
            >
              <div className="page-container py-4 flex flex-col gap-2">
                {[
                  { to: '/', label: 'Home' },
                  { to: '/products', label: 'Shop All' },
                  { to: '/contact', label: 'Contact' },
                  { to: '/faq', label: 'FAQ' },
                ].map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      cn('px-4 py-3 rounded-xl text-sm font-medium transition-all',
                        isActive
                          ? 'bg-gold-50 text-champagne-gold'
                          : 'text-midnight-navy hover:bg-gold-50 hover:text-champagne-gold')
                    }
                    onClick={() => setIsMobileOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                ))}
                <div className="border-t border-gold-100 pt-3 mt-1 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-charcoal/50 uppercase tracking-widest px-4">Categories</p>
                  {categories.slice(0, 5).map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/categories/${cat.slug}`}
                      className="px-4 py-2.5 rounded-xl text-sm text-charcoal hover:bg-gold-50 hover:text-champagne-gold transition-all"
                      onClick={() => setIsMobileOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
                {!isAuthenticated && (
                  <div className="border-t border-gold-100 pt-3 mt-1 flex gap-3">
                    <Link to="/login" className="flex-1 btn-navy text-center py-3 text-sm rounded-xl" onClick={() => setIsMobileOpen(false)}>Sign In</Link>
                    <Link to="/register" className="flex-1 btn-secondary text-center py-3 text-sm rounded-xl" onClick={() => setIsMobileOpen(false)}>Register</Link>
                  </div>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Search overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-midnight-navy/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSearch} className="glass rounded-2xl shadow-gold-lg overflow-hidden flex">
                <input
                  id="search-input"
                  type="search"
                  placeholder="Search pearls, beads, gemstones…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="flex-1 px-6 py-4 bg-transparent text-charcoal placeholder-charcoal/50 text-lg outline-none"
                  aria-label="Search products"
                />
                <button type="submit" className="btn-primary rounded-none px-6" aria-label="Submit search">
                  <Search size={20} />
                </button>
              </form>
              <p className="text-center text-pearl-ivory/60 text-sm mt-3">
                Press <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs">Esc</kbd> to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
