import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Artwork, ArtworkVariation } from '../types';

export function cartKey(item: Pick<CartItem, 'artwork' | 'variation'>): string {
  return `${item.artwork.id}:${item.variation?.id ?? ''}`;
}

export function stockOf(item: Pick<CartItem, 'artwork' | 'variation'>): number {
  return item.variation ? item.variation.quantity : item.artwork.quantity ?? 1;
}

export function unitPrice(item: Pick<CartItem, 'artwork' | 'variation'>): number {
  return item.variation?.price ?? item.artwork.price;
}

interface CartStore {
  items: CartItem[];
  addItem: (artwork: Artwork, variation?: ArtworkVariation, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (artwork, variation, quantity = 1) => {
        set((state) => {
          const key = cartKey({ artwork, variation });
          const stock = Math.max(1, stockOf({ artwork, variation }));
          const existing = state.items.find(i => cartKey(i) === key);
          if (existing) {
            return {
              items: state.items.map(i =>
                cartKey(i) === key ? { ...i, quantity: Math.min(stock, i.quantity + quantity) } : i
              ),
            };
          }
          return { items: [...state.items, { artwork, variation, quantity: Math.min(stock, Math.max(1, quantity)) }] };
        });
      },

      removeItem: (key) => {
        set((state) => ({ items: state.items.filter(i => cartKey(i) !== key) }));
      },

      updateQuantity: (key, quantity) => {
        if (quantity < 1) {
          get().removeItem(key);
          return;
        }
        set((state) => ({
          items: state.items.map(i =>
            cartKey(i) === key ? { ...i, quantity: Math.min(quantity, Math.max(1, stockOf(i))) } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, item) => sum + unitPrice(item) * item.quantity, 0),

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'thefinearc-cart' }
  )
);
