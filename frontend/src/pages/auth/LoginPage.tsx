import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Gem, Mail, Lock, Phone, KeyRound, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, sendOtp, loginWithOtp } = useAuth();

  // 'otp' is the default login method as requested
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');

  // OTP form state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Email form state
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendOtp(cleanPhone);
      setOtpSent(true);
      setDemoOtpHint(res.demo_otp || '123456');
      toast.success(`OTP sent to ${cleanPhone}`);
      setResendCooldown(30);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Verify OTP Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithOtp(phone.trim(), otp.trim());
      toast.success('Signed in successfully!');
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email/Password Login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-navy relative overflow-hidden items-center justify-center">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #D7B15D 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative text-center px-12">
          <div className="w-24 h-24 rounded-full bg-champagne-gold/20 flex items-center justify-center mx-auto mb-6">
            <Gem size={40} className="text-champagne-gold" />
          </div>
          <h2 className="font-display text-4xl text-pearl-ivory font-semibold mb-4">
            Jai Bhavani Pearls & Beads
          </h2>
          <p className="text-pearl-ivory/70 text-lg leading-relaxed">
            India's finest destination for natural pearls, gemstone beads, and premium jewellery-making supplies.
          </p>
        </div>
        <div className="absolute top-20 right-10 w-40 h-40 rounded-full bg-champagne-gold/10 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-32 h-32 rounded-full bg-champagne-gold/8 blur-2xl" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-pearl-ivory">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-champagne-gold/30 bg-champagne-gold/10 mb-4">
              <span className="text-xs font-semibold text-champagne-gold uppercase tracking-widest">Welcome Back</span>
            </div>
            <h1 className="font-display text-3xl text-midnight-navy font-semibold">Sign In</h1>
            <p className="text-charcoal/60 mt-2 text-sm">Choose your preferred login method</p>
          </div>

          {/* Login Method Toggle - OTP is default */}
          <div className="flex p-1 bg-gray-200/80 rounded-xl mb-6">
            <button
              type="button"
              id="login-method-otp-tab"
              onClick={() => setLoginMethod('otp')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                loginMethod === 'otp'
                  ? 'bg-white shadow-sm text-midnight-navy font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Phone size={14} className={loginMethod === 'otp' ? 'text-champagne-gold' : ''} />
              Mobile OTP <span className="text-[10px] bg-champagne-gold/20 text-champagne-gold px-1.5 py-0.5 rounded-md font-bold">Default</span>
            </button>
            <button
              type="button"
              id="login-method-password-tab"
              onClick={() => setLoginMethod('password')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                loginMethod === 'password'
                  ? 'bg-white shadow-sm text-midnight-navy font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Mail size={14} className={loginMethod === 'password' ? 'text-champagne-gold' : ''} />
              Email & Password
            </button>
          </div>

          {/* OTP LOGIN (Default) */}
          {loginMethod === 'otp' ? (
            <div className="space-y-5">
              {!otpSent ? (
                /* Step 1: Request Mobile Number */
                <form id="send-otp-form" onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label htmlFor="otp-mobile-input" className="block text-sm font-medium text-midnight-navy mb-2">
                      Mobile Number
                    </label>
                    <div className="relative flex">
                      <div className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-600 text-sm font-medium">
                        +91
                      </div>
                      <input
                        id="otp-mobile-input"
                        type="tel"
                        maxLength={10}
                        required
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="input-field rounded-l-none pl-3"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-charcoal/50 mt-1.5 flex items-center gap-1">
                      <ShieldCheck size={13} className="text-emerald-600" />
                      We will send a 6-digit one-time verification password
                    </p>
                  </div>

                  <button
                    id="send-otp-btn"
                    type="submit"
                    disabled={isLoading || phone.length < 10}
                    className="btn-primary w-full py-3.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-midnight-navy/30 border-t-midnight-navy animate-spin" />
                        Sending OTP…
                      </span>
                    ) : (
                      <>Get OTP <ArrowRight size={16} /></>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Enter & Verify OTP */
                <form id="verify-otp-form" onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-champagne-gold/10 border border-champagne-gold/20 rounded-xl flex items-center justify-between text-xs text-midnight-navy">
                    <div>
                      <span>OTP sent to </span>
                      <strong className="font-semibold">+91 {phone}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtp(''); }}
                      className="text-champagne-gold hover:underline font-semibold"
                    >
                      Change
                    </button>
                  </div>

                  {demoOtpHint && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
                      <span>Demo Verification Code:</span>
                      <span className="font-mono font-bold tracking-widest text-sm bg-emerald-100 px-2 py-0.5 rounded">
                        {demoOtpHint}
                      </span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="otp-code-input" className="block text-sm font-medium text-midnight-navy mb-2">
                      Enter 6-Digit OTP
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                      <input
                        id="otp-code-input"
                        type="text"
                        maxLength={6}
                        required
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="input-field pl-11 font-mono tracking-widest text-base font-semibold"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-charcoal/60">Didn't receive OTP?</span>
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || isLoading}
                      onClick={() => handleSendOtp()}
                      className="text-champagne-gold font-semibold hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>

                  <button
                    id="verify-otp-btn"
                    type="submit"
                    disabled={isLoading || otp.length < 6}
                    className="btn-primary w-full py-3.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-midnight-navy/30 border-t-midnight-navy animate-spin" />
                        Verifying…
                      </span>
                    ) : (
                      <>Verify & Sign In <ArrowRight size={16} /></>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* EMAIL & PASSWORD LOGIN */
            <form id="login-form" onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-midnight-navy mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field pl-11"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-midnight-navy">
                    Password
                  </label>
                  <Link to="/forgot-password" id="forgot-password-link" className="text-xs text-champagne-gold hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field pl-11 pr-11"
                  />
                  <button
                    type="button"
                    id="toggle-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-champagne-gold transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-midnight-navy/30 border-t-midnight-navy animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <>Sign In with Password <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-charcoal/60 mt-8">
            Don't have an account?{' '}
            <Link to="/register" id="go-to-register-link" className="text-champagne-gold font-semibold hover:underline">
              Create account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
