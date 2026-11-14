import { create } from 'zustand';
import type { Promo } from '../utils/pricing';

interface SalesStore {
  sales: Promo[];
  setSales: (sales: Promo[]) => void;
}

// Sales running right now (the database only shows visitors live ones)
export const useSalesStore = create<SalesStore>(set => ({
  sales: [],
  // Only replaces the list when something actually changed, so a refresh doesn't re-render the whole site
  setSales: sales => set(state => (JSON.stringify(state.sales) === JSON.stringify(sales) ? state : { sales })),
}));

export const useSales = () => useSalesStore(s => s.sales);
