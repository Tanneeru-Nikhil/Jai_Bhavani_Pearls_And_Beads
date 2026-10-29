import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setIsSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pearl-ivory flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card p-8 sm:p-10">
          {isSent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h1 className="font-display text-2xl text-midnight-navy font-semibold mb-3">Check Your Email</h1>
              <p className="text-charcoal/70 text-sm leading-relaxed mb-8">
                We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam folder.
              </p>
              <Link to="/login" id="back-to-login-from-forgot" className="btn-primary w-full justify-center py-3">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-gold-50 flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-champagne-gold" />
                </div>
                <h1 className="font-display text-2xl text-midnight-navy font-semibold mb-2">Forgot Password?</h1>
                <p className="text-charcoal/60 text-sm">Enter your email and we'll send you a reset link.</p>
              </div>

              <form id="forgot-password-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-midnight-navy mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-11"
                    />
                  </div>
                </div>

                <button
                  id="forgot-password-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-midnight-navy/30 border-t-midnight-navy animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    <>Send Reset Link <ArrowRight size={16} /></>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-charcoal/60 mt-6">
                Remember your password?{' '}
                <Link to="/login" id="back-to-login-link" className="text-champagne-gold font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
