import { useEffect } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import { useSalesStore } from '../store/salesStore';
import type { Artwork } from '../types';

// Keeps items already in a customer's cart in line with the current listings (price, stock, sold out).
export function useCartSync(intervalMs = 60_000) {
  const ids = useCartStore(s => Array.from(new Set(s.items.map(i => i.artwork.id))).sort().join(','));
  const sync = useCartStore(s => s.syncWithListings);
  const salesKey = useSalesStore(s => s.sales.map(x => `${x.id}:${x.discount_value}`).join(','));

  useEffect(() => {
    if (!ids || !supabaseConfigured) return;
    let cancelled = false;

    async function refresh() {
      const { data, error } = await supabase.from('artworks').select('*').in('id', ids.split(','));
      if (!error && data && !cancelled) sync(data as Artwork[]);
    }

    refresh();
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      clearInterval(timer);
    };
  }, [ids, sync, intervalMs, salesKey]);
}
