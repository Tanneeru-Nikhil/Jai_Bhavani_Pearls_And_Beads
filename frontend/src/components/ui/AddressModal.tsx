import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Home, Briefcase, Tag, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import type { Address } from '@/types';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAddressId?: string) => void;
  initialData?: Address | null;
}

const COMMON_STATES = [
  'Telangana',
  'Andhra Pradesh',
  'Karnataka',
  'Maharashtra',
  'Tamil Nadu',
  'Gujarat',
  'Rajasthan',
  'Delhi',
  'Kerala',
  'Uttar Pradesh',
  'West Bengal',
  'Madhya Pradesh',
  'Punjab',
  'Haryana',
  'Goa',
];

export default function AddressModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: AddressModalProps) {
  const [form, setForm] = useState({
    label: 'Home',
    recipient_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: 'Hyderabad',
    state: 'Telangana',
    postal_code: '',
    country: 'India',
    is_default: false,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        label: initialData.label || 'Home',
        recipient_name: initialData.recipient_name || '',
        phone: initialData.phone || '',
        address_line1: initialData.address_line1 || '',
        address_line2: initialData.address_line2 || '',
        city: initialData.city || 'Hyderabad',
        state: initialData.state || 'Telangana',
        postal_code: initialData.postal_code || '',
        country: initialData.country || 'India',
        is_default: !!initialData.is_default,
      });
    } else {
      setForm({
        label: 'Home',
        recipient_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: 'Hyderabad',
        state: 'Telangana',
        postal_code: '',
        country: 'India',
        is_default: false,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipient_name.trim() || !form.phone.trim() || !form.address_line1.trim() || !form.postal_code.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        await api.put(`/users/me/addresses/${initialData.id}`, form);
        toast.success('Address updated successfully');
        onSuccess(initialData.id);
      } else {
        const res = await api.post('/users/me/addresses', form);
        toast.success('Address added successfully');
        onSuccess(res.data?.id);
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight-navy/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="bg-white rounded-2xl shadow-2xl border border-navy-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100 bg-pearl-ivory/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold-50 flex items-center justify-center text-champagne-gold">
                <MapPin size={18} />
              </div>
              <h2 className="font-display font-semibold text-lg text-midnight-navy">
                {initialData ? 'Edit Address' : 'Add New Address'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal/50 hover:text-midnight-navy hover:bg-black/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {/* Address Type / Label */}
            <div>
              <label className="block text-xs font-semibold text-charcoal/70 uppercase tracking-wider mb-2">
                Address Type
              </label>
              <div className="flex gap-2">
                {[
                  { label: 'Home', icon: Home },
                  { label: 'Work', icon: Briefcase },
                  { label: 'Other', icon: Tag },
                ].map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, label }))}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.label === label
                        ? 'border-champagne-gold bg-gold-50 text-midnight-navy font-semibold shadow-xs'
                        : 'border-navy-100 text-charcoal/60 hover:border-gold-300'
                    }`}
                  >
                    <Icon size={14} className={form.label === label ? 'text-champagne-gold' : ''} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1">
                  Recipient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={form.recipient_name}
                  onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1">
                  Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>
            </div>

            {/* Address Line 1 */}
            <div>
              <label className="block text-xs font-medium text-charcoal/70 mb-1">
                Flat, House No., Building, Street <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Flat 302, Emerald Court, Jewellers Road"
                value={form.address_line1}
                onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))}
                className="input-field text-sm"
              />
            </div>

            {/* Address Line 2 */}
            <div>
              <label className="block text-xs font-medium text-charcoal/70 mb-1">
                Area, Landmark (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Near Charminar Pearl Market"
                value={form.address_line2}
                onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))}
                className="input-field text-sm"
              />
            </div>

            {/* City & State */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hyderabad"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className="input-field text-sm bg-white"
                >
                  {COMMON_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Postal Code & Country */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1">
                  PIN / Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="500002"
                  value={form.postal_code}
                  onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1">Country</label>
                <input
                  type="text"
                  disabled
                  value={form.country}
                  className="input-field text-sm bg-gray-50 text-charcoal/60 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Default Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                className="w-4 h-4 rounded text-champagne-gold border-gold-300 focus:ring-champagne-gold"
              />
              <span className="text-xs text-charcoal/80 font-medium">
                Make this my default delivery address
              </span>
            </label>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-100">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary py-2 px-4 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary py-2 px-6 text-xs flex items-center gap-1.5"
              >
                {loading ? 'Saving…' : <><Check size={14} /> Save Address</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
