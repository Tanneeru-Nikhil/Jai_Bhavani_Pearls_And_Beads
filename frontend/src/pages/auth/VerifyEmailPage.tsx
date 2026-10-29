import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '@/lib/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-pearl-ivory flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card p-10 text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-gold-50 flex items-center justify-center mx-auto mb-6">
                <Loader size={32} className="text-champagne-gold animate-spin" />
              </div>
              <h1 className="font-display text-2xl text-midnight-navy font-semibold mb-2">Verifying Email…</h1>
              <p className="text-charcoal/60 text-sm">Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h1 className="font-display text-2xl text-midnight-navy font-semibold mb-3">Email Verified!</h1>
              <p className="text-charcoal/70 text-sm leading-relaxed mb-8">
                Your email address has been successfully verified. You can now sign in to your account.
              </p>
              <Link to="/login" id="verify-success-login-btn" className="btn-primary w-full justify-center py-3">
                Sign In Now
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                <XCircle size={32} className="text-red-500" />
              </div>
              <h1 className="font-display text-2xl text-midnight-navy font-semibold mb-3">Verification Failed</h1>
              <p className="text-charcoal/70 text-sm leading-relaxed mb-8">
                The verification link is invalid or has expired. Please request a new verification email.
              </p>
              <div className="space-y-3">
                <Link to="/login" id="verify-error-login-btn" className="btn-primary w-full justify-center py-3 block">
                  Back to Sign In
                </Link>
                <Link to="/contact" id="verify-contact-link" className="btn-secondary w-full justify-center py-3 block">
                  Contact Support
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
