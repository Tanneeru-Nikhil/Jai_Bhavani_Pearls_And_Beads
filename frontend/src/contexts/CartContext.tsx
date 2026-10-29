import React, { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Cart } from '@/types';

interface CartContextValue {
  cart: Cart | undefined;
  isLoading: boolean;
  itemCount: number;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get<Cart>('/cart');
      return data;
    },
    staleTime: 1000 * 30,
  });

  const invalidateCart = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  }, [queryClient]);

  const addItemMutation = useMutation({
    mutationFn: (vars: { variantId: string; quantity: number }) =>
      api.post('/cart/items', { variant_id: vars.variantId, quantity: vars.quantity }),
    onSuccess: invalidateCart,
  });

  const updateItemMutation = useMutation({
    mutationFn: (vars: { itemId: string; quantity: number }) =>
      api.patch(`/cart/items/${vars.itemId}`, { quantity: vars.quantity }),
    onSuccess: invalidateCart,
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/cart/items/${itemId}`),
    onSuccess: invalidateCart,
  });

  const clearCartMutation = useMutation({
    mutationFn: () => api.delete('/cart'),
    onSuccess: invalidateCart,
  });

  const addItem = useCallback(async (variantId: string, quantity: number) => {
    await addItemMutation.mutateAsync({ variantId, quantity });
  }, [addItemMutation]);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    await updateItemMutation.mutateAsync({ itemId, quantity });
  }, [updateItemMutation]);

  const removeItem = useCallback(async (itemId: string) => {
    await removeItemMutation.mutateAsync(itemId);
  }, [removeItemMutation]);

  const clearCart = useCallback(async () => {
    await clearCartMutation.mutateAsync();
  }, [clearCartMutation]);

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        itemCount: cart?.item_count ?? 0,
        addItem,
        updateItem,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
