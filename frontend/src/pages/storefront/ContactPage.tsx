import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/contact', form);
      setSubmitted(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-pearl-ivory min-h-screen">
      {/* Hero */}
      <section className="bg-midnight-navy text-white py-16 px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4">Contact Us</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            We'd love to hear from you. Reach out for product queries, bulk orders, or any assistance.
          </p>
        </motion.div>
      </section>

      <div className="page-container py-16">
        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-8"
          >
            <div>
              <h2 className="font-display text-2xl text-midnight-navy font-semibold mb-2">
                Get in touch
              </h2>
              <p className="text-charcoal/70">
                Whether you're looking for wholesale pricing, a custom order, or just have a question
                about our pearls — our team is here to help.
              </p>
            </div>

            <div className="space-y-5">
              {[
                {
                  icon: MapPin,
                  label: 'Address',
                  value: '24, Jewellers Street, Hyderabad, Telangana – 500002, India',
                },
                {
                  icon: Phone,
                  label: 'Phone',
                  value: '+91 98765 43210',
                },
                {
                  icon: Mail,
                  label: 'Email',
                  value: 'hello@jaibhavanibeads.com',
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={18} className="text-champagne-gold" />
                  </div>
                  <div>
                    <div className="text-xs text-charcoal/50 font-medium uppercase tracking-wide mb-0.5">
                      {label}
                    </div>
                    <div className="text-midnight-navy font-medium text-sm">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-2xl bg-midnight-navy/5 border border-navy-100">
              <h3 className="font-semibold text-midnight-navy text-sm mb-1">Business Hours</h3>
              <div className="text-sm text-charcoal/70 space-y-0.5">
                <div className="flex justify-between"><span>Mon – Sat</span><span>9:00 AM – 7:00 PM IST</span></div>
                <div className="flex justify-between"><span>Sunday</span><span>Closed</span></div>
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-8"
          >
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-green-600" />
                </div>
                <h3 className="font-display text-xl text-midnight-navy font-semibold mb-2">
                  Message Sent!
                </h3>
                <p className="text-charcoal/60 text-sm">
                  We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-charcoal/60 mb-1.5">Your Name</label>
                    <input
                      id="contact-name"
                      className="input-field"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Priya Sharma"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-charcoal/60 mb-1.5">Email</label>
                    <input
                      id="contact-email"
                      type="email"
                      className="input-field"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="priya@email.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-charcoal/60 mb-1.5">Phone (optional)</label>
                    <input
                      id="contact-phone"
                      className="input-field"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-charcoal/60 mb-1.5">Subject</label>
                    <input
                      id="contact-subject"
                      className="input-field"
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="Bulk order inquiry"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-charcoal/60 mb-1.5">Message</label>
                  <textarea
                    id="contact-message"
                    className="input-field resize-none"
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us about your requirements…"
                    required
                  />
                </div>
                <button
                  id="contact-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-base"
                >
                  <Send size={16} />
                  {loading ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
