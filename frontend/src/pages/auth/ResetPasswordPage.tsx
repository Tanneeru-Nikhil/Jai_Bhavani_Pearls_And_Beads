import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (!token) {
      toast.error('Invalid or missing reset token');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      setIsDone(true);
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
          {isDone ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h1 className="font-display text-2xl text-midnight-navy font-semibold mb-3">Password Reset!</h1>
              <p className="text-charcoal/70 text-sm leading-relaxed mb-8">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <Link to="/login" id="reset-done-login-btn" className="btn-primary w-full justify-center py-3">
                Sign In Now <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-gold-50 flex items-center justify-center mx-auto mb-4">
                  <Lock size={24} className="text-champagne-gold" />
                </div>
                <h1 className="font-display text-2xl text-midnight-navy font-semibold mb-2">Set New Password</h1>
                <p className="text-charcoal/60 text-sm">Enter a strong password for your account.</p>
              </div>

              <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-midnight-navy mb-2">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="input-field pl-11 pr-11"
                    />
                    <button
                      type="button"
                      id="toggle-new-password"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-champagne-gold transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-new-password" className="block text-sm font-medium text-midnight-navy mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                    <input
                      id="confirm-new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat password"
                      value={form.confirm_password}
                      onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                      className="input-field pl-11"
                    />
                  </div>
                </div>

                <button
                  id="reset-password-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-midnight-navy/30 border-t-midnight-navy animate-spin" />
                      Resetting…
                    </span>
                  ) : (
                    <>Reset Password <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
