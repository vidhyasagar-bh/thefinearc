import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Artwork } from '../types';

interface CartStore {
  items: CartItem[];
  addItem: (artwork: Artwork) => void;
  removeItem: (artworkId: string) => void;
  updateQuantity: (artworkId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (artwork: Artwork) => {
        set((state) => {
          // Original artworks are unique — cap at 1
          if (state.items.find(i => i.artwork.id === artwork.id)) return state;
          return { items: [...state.items, { artwork, quantity: 1 }] };
        });
      },

      removeItem: (artworkId: string) => {
        set((state) => ({
          items: state.items.filter(i => i.artwork.id !== artworkId),
        }));
      },

      updateQuantity: (artworkId: string, quantity: number) => {
        if (quantity < 1) {
          get().removeItem(artworkId);
          return;
        }
        set((state) => ({
          items: state.items.map(i =>
            i.artwork.id === artworkId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      total: () => {
        return get().items.reduce(
          (sum, item) => sum + item.artwork.price * item.quantity,
          0
        );
      },

      itemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    { name: 'thefinearc-cart' }
  )
);
