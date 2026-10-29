import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Gem, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/register', {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      toast.success('Account created! Please check your email to verify.');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const field = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-navy relative overflow-hidden items-center justify-center">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #D7B15D 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative text-center px-10">
          <div className="w-24 h-24 rounded-full bg-champagne-gold/20 flex items-center justify-center mx-auto mb-6">
            <Gem size={40} className="text-champagne-gold" />
          </div>
          <h2 className="font-display text-3xl text-pearl-ivory font-semibold mb-4">
            Join Our Community
          </h2>
          <p className="text-pearl-ivory/70 leading-relaxed">
            Create an account to track orders, save your wishlist, and get personalised recommendations.
          </p>
          <div className="mt-8 space-y-3 text-left">
            {['Exclusive member discounts', 'Order tracking & history', 'Priority customer support', 'Wishlist & favourites'].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-champagne-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-champagne-gold" />
                </span>
                <span className="text-pearl-ivory/80 text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-pearl-ivory overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-champagne-gold/30 bg-champagne-gold/10 mb-4">
              <span className="text-xs font-semibold text-champagne-gold uppercase tracking-widest">New Account</span>
            </div>
            <h1 className="font-display text-3xl text-midnight-navy font-semibold">Create Account</h1>
            <p className="text-charcoal/60 mt-2 text-sm">Join thousands of artisans who trust us</p>
          </div>

          <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-midnight-navy mb-2">First Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                  <input
                    id="first_name"
                    type="text"
                    required
                    placeholder="First"
                    value={form.first_name}
                    onChange={field('first_name')}
                    className="input-field pl-11"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-midnight-navy mb-2">Last Name</label>
                <input
                  id="last_name"
                  type="text"
                  required
                  placeholder="Last"
                  value={form.last_name}
                  onChange={field('last_name')}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-midnight-navy mb-2">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={field('email')}
                  className="input-field pl-11"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-midnight-navy mb-2">
                Phone <span className="text-charcoal/40 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                <input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={field('phone')}
                  className="input-field pl-11"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-midnight-navy mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={field('password')}
                  className="input-field pl-11 pr-11"
                />
                <button
                  type="button"
                  id="toggle-reg-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-champagne-gold transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-midnight-navy mb-2">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                <input
                  id="confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat password"
                  value={form.confirm_password}
                  onChange={field('confirm_password')}
                  className="input-field pl-11"
                />
              </div>
            </div>

            <p className="text-xs text-charcoal/50">
              By creating an account you agree to our{' '}
              <a href="#" className="text-champagne-gold hover:underline">Terms of Service</a> and{' '}
              <a href="#" className="text-champagne-gold hover:underline">Privacy Policy</a>.
            </p>

            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-midnight-navy/30 border-t-midnight-navy animate-spin" />
                  Creating account…
                </span>
              ) : (
                <>Create Account <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-charcoal/60 mt-6">
            Already have an account?{' '}
            <Link to="/login" id="go-to-login-link" className="text-champagne-gold font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
