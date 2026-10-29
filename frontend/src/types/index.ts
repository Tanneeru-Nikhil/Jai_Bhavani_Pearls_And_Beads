// ============================================================
// Jai Bhavani Pearls & Beads — Shared Type Definitions
// ============================================================

// ─── Enums ───────────────────────────────────────────────────
export type UserRole = 'customer' | 'support' | 'inventory' | 'admin';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type EnquiryStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type SaleUnit = 'piece' | 'strand' | 'gram' | 'pack';
export type MaterialType = 'natural' | 'cultured' | 'imitation' | 'synthetic' | 'semi_precious' | 'metal' | 'other';
export type MovementType = 'purchase' | 'sale' | 'adjustment' | 'return' | 'reservation' | 'release' | 'write_off';

// ─── User ─────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

// ─── Catalogue ────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  color?: string;
  size_mm?: number;
  hole_diameter_mm?: number;
  finish?: string;
  material_type?: MaterialType;
  price: number;
  currency: string;
  sale_unit: SaleUnit;
  pack_quantity?: number;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  weight_grams?: number;
  images: ProductImage[];
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  category: Category;
  shape?: string;
  material?: string;
  origin?: string;
  quality_notes?: string;
  is_natural: boolean;
  is_published: boolean;
  tags: string[];
  variants: ProductVariant[];
  primary_image?: ProductImage;
  average_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  category: Pick<Category, 'id' | 'name' | 'slug'>;
  primary_image?: ProductImage;
  min_price: number;
  max_price: number;
  currency: string;
  average_rating: number;
  review_count: number;
  is_in_stock: boolean;
  variant_count: number;
}

// ─── Cart ─────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  variant: ProductVariant & { product: Pick<Product, 'id' | 'name' | 'slug'> };
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  item_count: number;
  subtotal: number;
  currency: string;
}

// ─── Order ────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  // Immutable snapshots at time of purchase
  sku: string;
  product_name: string;
  variant_description: string;
  unit_price: number;
  quantity: number;
  currency: string;
  subtotal: number;
  product_id: string;
  variant_id: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  currency: string;
  shipping_address: Omit<Address, 'id' | 'user_id' | 'is_default'>;
  coupon_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  shipment?: Shipment;
}

export interface Shipment {
  id: string;
  carrier: string;
  tracking_number?: string;
  tracking_url?: string;
  shipped_at?: string;
  estimated_delivery?: string;
  delivered_at?: string;
  status: string;
}

// ─── Checkout ─────────────────────────────────────────────────
export interface CheckoutSummary {
  items: CartItem[];
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  currency: string;
  coupon?: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  };
}

// ─── Reviews ──────────────────────────────────────────────────
export interface Review {
  id: string;
  product_id: string;
  user: Pick<User, 'id' | 'first_name'>;
  rating: number;
  title?: string;
  body: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
}

// ─── Enquiry & Quotation ──────────────────────────────────────
export interface Enquiry {
  id: string;
  reference: string;
  customer: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'>;
  category: string;
  subject: string;
  status: EnquiryStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: Pick<User, 'id' | 'first_name' | 'last_name'>;
  messages: EnquiryMessage[];
  quotation?: Quotation;
  created_at: string;
  updated_at: string;
}

export interface EnquiryMessage {
  id: string;
  sender: Pick<User, 'id' | 'first_name' | 'last_name' | 'role'>;
  body: string;
  is_internal_note: boolean;
  created_at: string;
}

export interface Quotation {
  id: string;
  enquiry_id: string;
  reference: string;
  status: QuotationStatus;
  amount: number;
  currency: string;
  valid_until: string;
  terms?: string;
  created_at: string;
}

// ─── Inventory ────────────────────────────────────────────────
export interface InventoryMovement {
  id: string;
  variant_id: string;
  movement_type: MovementType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason?: string;
  reference_id?: string;
  performed_by: Pick<User, 'id' | 'first_name' | 'last_name'>;
  created_at: string;
}

// ─── Pagination ───────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ─── API Errors ───────────────────────────────────────────────
export interface ApiError {
  detail: string | { loc: string[]; msg: string; type: string }[];
  status_code: number;
}

// ─── Filters ──────────────────────────────────────────────────
export interface ProductFilters {
  category?: string;
  material?: string;
  color?: string;
  shape?: string;
  size_min?: number;
  size_max?: number;
  price_min?: number;
  price_max?: number;
  in_stock?: boolean;
  is_natural?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'name_asc' | 'rating_desc' | 'newest';
  q?: string;
  page?: number;
  size?: number;
}

// ─── Admin ────────────────────────────────────────────────────
export interface AdminStats {
  total_revenue: number;
  revenue_this_month: number;
  total_orders: number;
  orders_today: number;
  total_customers: number;
  new_customers_this_month: number;
  open_enquiries: number;
  low_stock_items: number;
  currency: string;
}

export interface AuditLog {
  id: string;
  actor: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'>;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  ip_address?: string;
  created_at: string;
}
