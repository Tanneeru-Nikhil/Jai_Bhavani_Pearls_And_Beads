import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Plus, Trash2, UploadCloud, Image as ImageIcon, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import type { Product, Category } from '@/types';

interface ProductFormData {
  name: string;
  description: string;
  short_description: string;
  category_id: string;
  shape: string;
  material: string;
  origin: string;
  quality_notes: string;
  is_natural: boolean;
  is_published: boolean;
  tags: string;
  price: string;
  image_url: string;
}

const BLANK_FORM: ProductFormData = {
  name: '',
  description: '',
  short_description: '',
  category_id: '',
  shape: '',
  material: '',
  origin: '',
  quality_notes: '',
  is_natural: false,
  is_published: false,
  tags: '',
  price: '1500',
  image_url: '',
};

export default function AdminProductForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProductFormData>(BLANK_FORM);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/categories');
      return data;
    },
  });

  const { data: product } = useQuery<Product>({
    queryKey: ['product-detail', id],
    queryFn: async () => {
      const { data } = await api.get<Product>(`/products/${id}`);
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (product) {
      const initialPrice = product.variants?.[0]?.price?.toString() ?? '1500';
      const initialImage = product.primary_image?.url || product.variants?.[0]?.images?.[0]?.url || '';
      setForm({
        name: product.name,
        description: product.description,
        short_description: product.short_description ?? '',
        category_id: product.category.id,
        shape: product.shape ?? '',
        material: product.material ?? '',
        origin: product.origin ?? '',
        quality_notes: product.quality_notes ?? '',
        is_natural: product.is_natural,
        is_published: product.is_published,
        tags: product.tags.join(', '),
        price: initialPrice,
        image_url: initialImage,
      });
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit ? api.patch(`/admin/products/${id}`, payload) : api.post('/admin/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(isEdit ? 'Product updated!' : 'Product created!');
      navigate('/admin/products');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setForm((f) => ({ ...f, image_url: base64 }));
        toast.success('Product photo loaded');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(form.price);
    const payload = {
      ...form,
      price: isNaN(parsedPrice) ? 1500 : parsedPrice,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    saveMutation.mutate(payload);
  };

  const F = <K extends keyof ProductFormData>(key: K) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          id="product-form-back-btn"
          onClick={() => navigate('/admin/products')}
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-midnight-navy hover:border-gray-300 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-midnight-navy">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Product Photo Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4"
        >
          <h2 className="font-semibold text-midnight-navy flex items-center gap-2">
            <ImageIcon size={18} className="text-champagne-gold" /> Product Photo
          </h2>
          <p className="text-xs text-gray-500">
            Upload a photo from your computer or provide a direct web image URL.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Preview Box */}
            <div className="relative w-36 h-36 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0 flex items-center justify-center group">
              {form.image_url ? (
                <>
                  <img
                    src={form.image_url}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-medium"
                  >
                    Remove Photo
                  </button>
                </>
              ) : (
                <div className="text-center p-3 text-gray-400">
                  <ImageIcon size={28} className="mx-auto mb-1 opacity-50" />
                  <span className="text-[11px] block">No Photo</span>
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Upload Photo from Device
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="product-photo-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-midnight-navy transition-colors border border-gray-200"
                >
                  <UploadCloud size={15} />
                  Choose Image File…
                </button>
                <span className="text-[11px] text-gray-400 block mt-1">
                  Supports JPG, PNG, WEBP files
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Or Paste Photo URL
                </label>
                <input
                  id="product-photo-url"
                  className="input-field"
                  placeholder="https://images.unsplash.com/photo-..."
                  {...F('image_url')}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Basic Info & Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4"
        >
          <h2 className="font-semibold text-midnight-navy mb-4">Basic Information & Pricing</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Product Name *</label>
              <input id="product-name" className="input-field" {...F('name')} required placeholder="e.g. Natural Freshwater Pearl Strand" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                <IndianRupee size={12} className="text-champagne-gold" /> Price (INR ₹) *
              </label>
              <input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                required
                className="input-field font-semibold text-midnight-navy"
                {...F('price')}
                placeholder="1500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Short Description</label>
            <input id="product-short-desc" className="input-field" {...F('short_description')} placeholder="One-line summary" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Full Description *</label>
            <textarea
              id="product-desc"
              className="input-field resize-none"
              rows={5}
              {...F('description')}
              required
              placeholder="Detailed product description…"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Category *</label>
            <select id="product-category" className="input-field" {...F('category_id')} required>
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Attributes */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4"
        >
          <h2 className="font-semibold text-midnight-navy mb-4">Product Attributes</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Shape</label>
              <input id="product-shape" className="input-field" {...F('shape')} placeholder="Round, Oval, Baroque…" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Material</label>
              <input id="product-material" className="input-field" {...F('material')} placeholder="Freshwater Pearl, Crystal…" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Origin</label>
              <input id="product-origin" className="input-field" {...F('origin')} placeholder="China, India, Japan…" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Tags (comma-separated)</label>
              <input id="product-tags" className="input-field" {...F('tags')} placeholder="pearl, wedding, natural" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Quality Notes</label>
            <textarea id="product-quality" className="input-field resize-none" rows={3} {...F('quality_notes')} placeholder="Grading, luster, surface notes…" />
          </div>
        </motion.div>

        {/* Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="font-semibold text-midnight-navy mb-4">Settings</h2>
          <div className="space-y-4">
            {[
              { key: 'is_natural' as const, label: 'Natural Product', desc: 'Mark if this product is made from natural materials' },
              { key: 'is_published' as const, label: 'Published', desc: 'Make this product visible to customers' },
            ].map(({ key, label, desc }) => (
              <label
                key={key}
                htmlFor={`toggle-${key}`}
                className="flex items-center justify-between gap-4 cursor-pointer py-1"
              >
                <div>
                  <div className="text-sm font-medium text-midnight-navy">{label}</div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </div>
                <div className="relative flex-shrink-0">
                  <input
                    id={`toggle-${key}`}
                    type="checkbox"
                    className="sr-only peer"
                    checked={form[key] as boolean}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                  />
                  <div className="w-11 h-6 rounded-full bg-gray-200 peer-checked:bg-champagne-gold transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            id="product-save-btn"
            type="submit"
            disabled={saveMutation.isPending}
            className="btn-primary py-3 px-8 text-sm"
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="btn-secondary py-3 px-6 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
