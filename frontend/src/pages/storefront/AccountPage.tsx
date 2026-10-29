import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Lock, ShieldCheck, Pencil, Check, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Address } from '@/types';
import AddressModal from '@/components/ui/AddressModal';

interface ProfileForm {
  first_name: string;
  last_name: string;
  phone: string;
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export default function AccountPage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    phone: user?.phone ?? '',
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<Address[]>('/users/me/addresses');
      return data;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (form: ProfileForm) => api.patch('/users/me', form),
    onSuccess: async () => {
      await refreshUser();
      toast.success('Profile updated!');
      setEditingProfile(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (form: { current_password: string; new_password: string }) =>
      api.post('/auth/change-password', form),
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address removed');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    changePasswordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  if (!user) return null;

  return (
    <div className="page-container py-8 lg:py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-3xl text-midnight-navy font-semibold">My Account</h1>

        {/* ── Profile ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-midnight-navy flex items-center gap-2">
              <User size={18} className="text-champagne-gold" /> Profile
            </h2>
            {!editingProfile && (
              <button
                id="edit-profile-btn"
                onClick={() => {
                  setProfileForm({
                    first_name: user.first_name,
                    last_name: user.last_name,
                    phone: user.phone ?? '',
                  });
                  setEditingProfile(true);
                }}
                className="flex items-center gap-1.5 text-sm text-champagne-gold hover:underline"
              >
                <Pencil size={13} /> Edit
              </button>
            )}
          </div>

          {editingProfile ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfileMutation.mutate(profileForm);
              }}
              className="space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-charcoal/60 mb-1.5">First Name</label>
                  <input
                    id="profile-first-name"
                    className="input-field"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, first_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-charcoal/60 mb-1.5">Last Name</label>
                  <input
                    id="profile-last-name"
                    className="input-field"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, last_name: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 mb-1.5">Phone</label>
                <input
                  id="profile-phone"
                  className="input-field"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  id="profile-save-btn"
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="btn-primary py-2 px-5 text-sm"
                >
                  <Check size={14} />
                  {updateProfileMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="btn-secondary py-2 px-5 text-sm"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <User size={16} className="text-charcoal/40" />
                <span className="text-midnight-navy font-medium">
                  {user.first_name} {user.last_name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-charcoal/40" />
                <span className="text-charcoal/70">{user.email}</span>
                {user.email_verified && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} /> Verified
                  </span>
                )}
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-charcoal/40" />
                  <span className="text-charcoal/70">{user.phone}</span>
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* ── Saved Addresses ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-midnight-navy flex items-center gap-2">
              <MapPin size={18} className="text-champagne-gold" /> Saved Addresses
            </h2>
            <button
              id="add-address-btn"
              onClick={() => {
                setEditingAddress(null);
                setAddressModalOpen(true);
              }}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              <Plus size={13} /> Add Address
            </button>
          </div>
          {addresses.length === 0 ? (
            <div className="text-center py-8 bg-pearl-ivory/50 rounded-xl border border-navy-100">
              <MapPin size={28} className="mx-auto text-charcoal/30 mb-2" />
              <p className="text-sm font-medium text-midnight-navy mb-1">No saved addresses</p>
              <p className="text-xs text-charcoal/60 mb-4">Add your shipping details for smooth and fast checkout</p>
              <button
                id="empty-add-address-btn"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressModalOpen(true);
                }}
                className="btn-primary py-2 px-4 text-xs inline-flex items-center gap-1.5"
              >
                <Plus size={13} /> Add New Address
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-xl border border-navy-100 bg-pearl-ivory/50"
                >
                  <div className="text-sm">
                    <div className="font-semibold text-midnight-navy mb-0.5 flex items-center gap-2">
                      <span>{addr.label}</span>
                      {addr.is_default ? (
                        <span className="badge-gold text-[10px]">Default</span>
                      ) : null}
                    </div>
                    <div className="text-charcoal/70">
                      {addr.recipient_name} · {addr.phone}
                    </div>
                    <div className="text-charcoal/70">
                      {addr.address_line1}
                      {addr.address_line2 && `, ${addr.address_line2}`}
                    </div>
                    <div className="text-charcoal/70">
                      {addr.city}, {addr.state} – {addr.postal_code}, {addr.country}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-address-${addr.id}`}
                      onClick={() => {
                        setEditingAddress(addr);
                        setAddressModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-charcoal/40 hover:text-midnight-navy hover:bg-black/5 transition-colors"
                      title="Edit address"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      id={`delete-address-${addr.id}`}
                      onClick={() => deleteAddressMutation.mutate(addr.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete address"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Change Password ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <h2 className="font-semibold text-midnight-navy flex items-center gap-2 mb-4">
            <Lock size={18} className="text-champagne-gold" /> Change Password
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-charcoal/60 mb-1.5">Current Password</label>
              <input
                id="current-password"
                type="password"
                className="input-field"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, current_password: e.target.value }))
                }
                required
                autoComplete="current-password"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-charcoal/60 mb-1.5">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  className="input-field"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, new_password: e.target.value }))
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal/60 mb-1.5">Confirm New Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  className="input-field"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <button
              id="change-password-btn"
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="btn-primary py-2.5 px-6 text-sm"
            >
              {changePasswordMutation.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </motion.section>
      </div>

      <AddressModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        initialData={editingAddress}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['addresses'] });
        }}
      />
    </div>
  );
}
