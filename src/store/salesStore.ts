import { create } from 'zustand';
import type { Promo } from '../utils/pricing';

interface SalesStore {
  sales: Promo[];
  setSales: (sales: Promo[]) => void;
}

// Sales running right now (the database only shows visitors live ones)
export const useSalesStore = create<SalesStore>(set => ({
  sales: [],
  setSales: sales => set({ sales }),
}));

export const useSales = () => useSalesStore(s => s.sales);
