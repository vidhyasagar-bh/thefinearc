import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Artwork, ArtworkVariation } from '../types';

export function cartKey(item: Pick<CartItem, 'artwork' | 'variation'>): string {
  return `${item.artwork.id}:${item.variation?.id ?? ''}`;
}

export function unitPrice(item: Pick<CartItem, 'artwork' | 'variation'>): number {
  return item.variation?.price ?? item.artwork.price;
}

interface CartStore {
  items: CartItem[];
  addItem: (artwork: Artwork, variation?: ArtworkVariation) => void;
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

      addItem: (artwork, variation) => {
        set((state) => {
          // Original artworks are unique — cap at 1 per artwork/variation
          const key = cartKey({ artwork, variation });
          if (state.items.find(i => cartKey(i) === key)) return state;
          return { items: [...state.items, { artwork, variation, quantity: 1 }] };
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
          items: state.items.map(i => (cartKey(i) === key ? { ...i, quantity } : i)),
        }));
      },

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, item) => sum + unitPrice(item) * item.quantity, 0),

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'thefinearc-cart' }
  )
);
