import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, ShieldOff, UserPlus, Key, X, Check, Copy } from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { PaginatedResponse, User } from '@/types';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-purple-700 bg-purple-50 border border-purple-200',
  support: 'text-blue-700 bg-blue-50 border border-blue-200',
  inventory: 'text-amber-700 bg-amber-50 border border-amber-200',
  customer: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
};

export default function AdminCustomers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for creating an admin
  const [newAdmin, setNewAdmin] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'admin',
    password: '',
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Adm!';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAdmin((prev) => ({ ...prev, password: pass }));
    toast.success('Generated random secure password!');
  };

  const { data, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ['admin-customers', search, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<User>>('/admin/users', {
        params: { q: search || undefined, page, size: 20 },
      });
      return data;
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: (payload: typeof newAdmin) => api.post('/admin/users', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success(res.data?.message || 'Admin account created successfully!');
      setIsModalOpen(false);
      setNewAdmin({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'admin',
        password: '',
      });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.password) {
      toast.error('Please enter or generate a password');
      return;
    }
    createAdminMutation.mutate(newAdmin);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">Users & Admins</h1>
          <p className="text-sm text-charcoal/60 mt-1">
            Manage customer accounts, generate admin credentials, and assign staff roles.
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            generatePassword();
          }}
          className="btn-primary py-2.5 px-4 text-sm inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus size={16} />
          Create Admin / Staff
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          id="admin-customers-search"
          className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/50 w-full"
          placeholder="Search name, email, or role…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email / Login ID</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Verified</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? [1, 2, 3].map((i) => (
                    <tr key={i}><td className="px-5 py-4" colSpan={6}><div className="skeleton h-4 rounded w-3/4" /></td></tr>
                  ))
                : data?.items.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-midnight-navy/10 flex items-center justify-center text-xs font-bold text-midnight-navy flex-shrink-0">
                            {user.first_name[0]}{user.last_name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-midnight-navy">
                              {user.first_name} {user.last_name}
                            </div>
                            {user.phone && (
                              <div className="text-xs text-gray-400">{user.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 font-mono text-xs hidden sm:table-cell">{user.email}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full capitalize ${ROLE_COLORS[user.role] ?? 'text-gray-600 bg-gray-50'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {user.email_verified ? (
                          <span title="Email verified"><Shield size={15} className="text-green-500" /></span>
                        ) : (
                          <span title="Not verified"><ShieldOff size={15} className="text-gray-300" /></span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-300'}`} title={user.is_active ? 'Active' : 'Inactive'} />
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{data.total} users · Page {page} of {data.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Admin / Staff */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100 relative overflow-hidden"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-champagne-gold/20 flex items-center justify-center text-midnight-navy">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-midnight-navy">Create Admin / Staff</h3>
                  <p className="text-xs text-gray-500">Generate credentials for management portal</p>
                </div>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                    <input
                      required
                      type="text"
                      className="input-field text-sm py-2"
                      placeholder="e.g. Rahul"
                      value={newAdmin.first_name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                    <input
                      required
                      type="text"
                      className="input-field text-sm py-2"
                      placeholder="e.g. Verma"
                      value={newAdmin.last_name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email / Admin ID</label>
                  <input
                    required
                    type="email"
                    className="input-field text-sm py-2"
                    placeholder="admin.rahul@jaibhavani.com"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone (Optional)</label>
                    <input
                      type="tel"
                      className="input-field text-sm py-2"
                      placeholder="+91 98765 00000"
                      value={newAdmin.phone}
                      onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                    <select
                      className="input-field text-sm py-2"
                      value={newAdmin.role}
                      onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                    >
                      <option value="admin">Administrator</option>
                      <option value="inventory">Inventory Manager</option>
                      <option value="support">Support Staff</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Password</label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-xs text-champagne-gold font-semibold hover:underline flex items-center gap-1"
                    >
                      <Key size={12} /> Auto-Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      className="input-field text-sm py-2 font-mono"
                      placeholder="Enter or generate password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    />
                    {newAdmin.password && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(newAdmin.password);
                          toast.success('Password copied to clipboard!');
                        }}
                        title="Copy password"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-midnight-navy"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAdminMutation.isPending}
                    className="btn-primary py-2 px-5 text-sm"
                  >
                    {createAdminMutation.isPending ? 'Creating…' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
