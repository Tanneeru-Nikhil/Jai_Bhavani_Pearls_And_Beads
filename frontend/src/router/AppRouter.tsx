import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import StorefrontLayout from '@/layouts/StorefrontLayout';
import AdminLayout from '@/layouts/AdminLayout';
import PageSpinner from '@/components/ui/PageSpinner';

// ─── Storefront Pages (lazy-loaded) ──────────────────────────
const HomePage = lazy(() => import('@/pages/storefront/HomePage'));
const ProductsPage = lazy(() => import('@/pages/storefront/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/storefront/ProductDetailPage'));
const CategoryPage = lazy(() => import('@/pages/storefront/CategoryPage'));
const CartPage = lazy(() => import('@/pages/storefront/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/storefront/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('@/pages/storefront/OrderSuccessPage'));
const OrdersPage = lazy(() => import('@/pages/storefront/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/storefront/OrderDetailPage'));
const WishlistPage = lazy(() => import('@/pages/storefront/WishlistPage'));
const AccountPage = lazy(() => import('@/pages/storefront/AccountPage'));
const EnquiryPage = lazy(() => import('@/pages/storefront/EnquiryPage'));
const EnquiryDetailPage = lazy(() => import('@/pages/storefront/EnquiryDetailPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));
const ContactPage = lazy(() => import('@/pages/storefront/ContactPage'));
const FAQPage = lazy(() => import('@/pages/storefront/FAQPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// ─── Admin Pages (lazy-loaded) ────────────────────────────────
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'));
const AdminProductForm = lazy(() => import('@/pages/admin/AdminProductForm'));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'));
const AdminOrderDetail = lazy(() => import('@/pages/admin/AdminOrderDetail'));
const AdminInventory = lazy(() => import('@/pages/admin/AdminInventory'));
const AdminEnquiries = lazy(() => import('@/pages/admin/AdminEnquiries'));
const AdminCustomers = lazy(() => import('@/pages/admin/AdminCustomers'));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminAuditLogs = lazy(() => import('@/pages/admin/AdminAuditLogs'));

// ─── Route Guards ─────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }: { children: React.ReactElement }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!['admin', 'support', 'inventory'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function GuestOnly({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

// ─── App Router ───────────────────────────────────────────────
export default function AppRouter() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* ── Storefront ── */}
        <Route element={<StorefrontLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:slug" element={<ProductDetailPage />} />
          <Route path="categories/:slug" element={<CategoryPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={
            <RequireAuth><CheckoutPage /></RequireAuth>
          } />
          <Route path="orders/success/:orderId" element={
            <RequireAuth><OrderSuccessPage /></RequireAuth>
          } />
          <Route path="account/orders" element={
            <RequireAuth><OrdersPage /></RequireAuth>
          } />
          <Route path="account/orders/:orderId" element={
            <RequireAuth><OrderDetailPage /></RequireAuth>
          } />
          <Route path="account/wishlist" element={
            <RequireAuth><WishlistPage /></RequireAuth>
          } />
          <Route path="account" element={
            <RequireAuth><AccountPage /></RequireAuth>
          } />
          <Route path="enquiries" element={
            <RequireAuth><EnquiryPage /></RequireAuth>
          } />
          <Route path="enquiries/:id" element={
            <RequireAuth><EnquiryDetailPage /></RequireAuth>
          } />
          <Route path="contact" element={<ContactPage />} />
          <Route path="faq" element={<FAQPage />} />

          {/* ── Auth ── */}
          <Route path="login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route path="forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
          <Route path="reset-password" element={<GuestOnly><ResetPasswordPage /></GuestOnly>} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
        </Route>

        {/* ── Admin ── */}
        <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/:id/edit" element={<AdminProductForm />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
