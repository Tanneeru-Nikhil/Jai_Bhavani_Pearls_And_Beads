import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR', short = false): string {
  if (short) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

export function getStockStatus(available: number): {
  label: string;
  color: string;
  isAvailable: boolean;
} {
  if (available <= 0) return { label: 'Out of Stock', color: 'text-red-600', isAvailable: false };
  if (available <= 5) return { label: `Only ${available} left`, color: 'text-amber-600', isAvailable: true };
  return { label: 'In Stock', color: 'text-green-600', isAvailable: true };
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  return labels[status] ?? status;
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-amber-600 bg-amber-50 border-amber-200',
    confirmed: 'text-blue-600 bg-blue-50 border-blue-200',
    processing: 'text-purple-600 bg-purple-50 border-purple-200',
    shipped: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    delivered: 'text-green-600 bg-green-50 border-green-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200',
    refunded: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[status] ?? 'text-gray-600 bg-gray-50 border-gray-200';
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-amber-700 bg-amber-100',
    paid: 'text-green-700 bg-green-100',
    failed: 'text-red-700 bg-red-100',
    refunded: 'text-gray-700 bg-gray-100',
    partially_refunded: 'text-orange-700 bg-orange-100',
  };
  return colors[status] ?? 'text-gray-700 bg-gray-100';
}

export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
