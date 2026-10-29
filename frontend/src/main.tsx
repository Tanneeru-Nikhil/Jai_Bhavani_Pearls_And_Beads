import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import AppRouter from '@/router/AppRouter';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,    // 2 min
      gcTime: 1000 * 60 * 10,      // 10 min
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if ((error as { response?: { status: number } }).response?.status &&
            (error as { response?: { status: number } }).response!.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <AppRouter />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#FFFFFF',
                  color: '#24262B',
                  border: '1px solid rgba(215, 177, 93, 0.3)',
                  borderRadius: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  boxShadow: '0 8px 32px rgba(7, 26, 53, 0.12)',
                },
                success: {
                  iconTheme: { primary: '#D7B15D', secondary: '#fff' },
                },
                error: {
                  iconTheme: { primary: '#DC2626', secondary: '#fff' },
                },
              }}
            />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
