import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Artwork, ArtworkVariation } from '../types';
import { priceFor } from '../utils/pricing';
import { useSalesStore } from './salesStore';

export function cartKey(item: Pick<CartItem, 'artwork' | 'variation'>): string {
  return `${item.artwork.id}:${item.variation?.id ?? ''}`;
}

export function stockOf(item: Pick<CartItem, 'artwork' | 'variation'>): number {
  return item.variation ? item.variation.quantity : item.artwork.quantity ?? 1;
}

// The listed price, before any sale
export function basePrice(item: Pick<CartItem, 'artwork' | 'variation'>): number {
  return item.variation?.price ?? item.artwork.price;
}

// What the customer pays per item right now (after any running sale)
export function unitPrice(item: Pick<CartItem, 'artwork' | 'variation'>): number {
  return priceFor(item.artwork, basePrice(item), useSalesStore.getState().sales).price;
}

export function isAvailable(item: Pick<CartItem, 'unavailable'>): boolean {
  return !item.unavailable;
}

const cents = (n: number) => Math.round(n * 100);

interface CartStore {
  items: CartItem[];
  couponCode: string | null;
  couponDiscount: number; // dollars taken off by the code, as worked out by the server
  couponError: string | null;
  addItem: (artwork: Artwork, variation?: ArtworkVariation, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  syncWithListings: (fresh: Artwork[]) => void;
  setCouponCode: (code: string) => void;
  removeCoupon: () => void;
  refreshCoupon: () => Promise<void>;
  subtotal: () => number;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      couponDiscount: 0,
      couponError: null,

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
          return {
            items: [...state.items, {
              artwork, variation,
              quantity: Math.min(stock, Math.max(1, quantity)),
              seenPrice: unitPrice({ artwork, variation }),
            }],
          };
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

      clearCart: () => set({ items: [], couponCode: null, couponDiscount: 0, couponError: null }),

      // Brings every cart item up to date with the current listings: new prices, new stock, sold-out and deleted pieces
      syncWithListings: (fresh) => {
        set((state) => ({
          items: state.items.map((item): CartItem => {
            const artwork = fresh.find(a => a.id === item.artwork.id);
            if (!artwork) return { ...item, unavailable: 'removed' };

            let variation = item.variation;
            if (variation) {
              const current = (artwork.variations ?? []).find(v => v.id === variation!.id);
              if (!current) return { ...item, artwork, unavailable: 'removed' };
              variation = current;
            }

            // The price the customer last saw (a price edit or a sale starting/ending both count as a change)
            const seen = item.seenPrice ?? unitPrice(item);
            const price = unitPrice({ artwork, variation });
            const stock = variation ? variation.quantity : artwork.quantity ?? (artwork.availability === 'available' ? 1 : 0);
            const reason: CartItem['unavailable'] =
              artwork.availability === 'reserved' ? 'reserved'
              : artwork.availability !== 'available' || stock < 1 ? 'sold_out'
              : undefined;

            const quantity = reason ? item.quantity : Math.min(item.quantity, stock);
            return {
              artwork,
              variation,
              quantity,
              unavailable: reason,
              seenPrice: price,
              priceWas: seen !== price ? seen : item.priceWas !== undefined && item.priceWas !== price ? item.priceWas : undefined,
              reducedFrom: quantity < item.quantity ? item.quantity : item.reducedFrom !== undefined && item.reducedFrom > quantity ? item.reducedFrom : undefined,
            };
          }),
        }));
      },

      setCouponCode: (code) => {
        set({ couponCode: code.trim().toUpperCase() || null, couponDiscount: 0, couponError: null });
      },

      removeCoupon: () => set({ couponCode: null, couponDiscount: 0, couponError: null }),

      // Asks the server how much the code takes off this cart (the server is the only one that knows the codes)
      refreshCoupon: async () => {
        const { couponCode, items } = get();
        if (!couponCode) return;
        const lines = items.filter(isAvailable).map(i => ({
          artworkId: i.artwork.id, variationId: i.variation?.id ?? null, quantity: i.quantity,
        }));
        if (lines.length === 0) { set({ couponDiscount: 0, couponError: null }); return; }
        try {
          const res = await fetch('/api/coupon', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: couponCode, items: lines }),
          });
          const data = await res.json().catch(() => ({}));
          if (get().couponCode !== couponCode) return; // changed while we were asking
          if (data.ok) set({ couponDiscount: data.discount_cents / 100, couponError: null });
          else if (res.status >= 500) return; // a hiccup: keep what we had
          else set({ couponDiscount: 0, couponError: data.error || 'That code could not be applied.' });
        } catch {
          /* offline: keep what we had */
        }
      },

      subtotal: () =>
        get().items.filter(isAvailable).reduce((sum, item) => sum + cents(unitPrice(item)) * item.quantity, 0) / 100,

      total: () => Math.max(0, cents(get().subtotal()) - cents(get().couponDiscount)) / 100,

      itemCount: () => get().items.filter(isAvailable).reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: 'thefinearc-cart',
      partialize: (s) => ({ items: s.items, couponCode: s.couponCode, couponDiscount: s.couponDiscount, couponError: s.couponError }),
    }
  )
);
