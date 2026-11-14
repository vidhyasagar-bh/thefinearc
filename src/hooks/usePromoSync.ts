import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import { useSalesStore } from '../store/salesStore';
import type { Promo } from '../utils/pricing';

// Keeps running sales fresh, picks up a code from a shared link (?coupon=CODE), and keeps the code's saving up to date.
export function usePromoSync() {
  const setSales = useSalesStore(s => s.setSales);
  const salesKey = useSalesStore(s => s.sales.map(x => `${x.id}:${x.discount_value}`).join(','));
  const couponCode = useCartStore(s => s.couponCode);
  const itemsKey = useCartStore(s => s.items.filter(i => !i.unavailable).map(i => `${i.artwork.id}:${i.variation?.id ?? ''}:${i.quantity}`).join('|'));
  const setCouponCode = useCartStore(s => s.setCouponCode);
  const refreshCoupon = useCartStore(s => s.refreshCoupon);

  // Sales: the database only returns the ones running right now
  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase.from('sales').select('*');
      if (!error && data && !cancelled) setSales(data as Promo[]);
    }
    load();
    window.addEventListener('focus', load);
    const timer = setInterval(load, 60_000);
    return () => { cancelled = true; window.removeEventListener('focus', load); clearInterval(timer); };
  }, [setSales]);

  // A shared link such as https://yoursite.com/?coupon=SPRING20
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('coupon');
    if (!code) return;
    setCouponCode(code);
    toast.success(`Code ${code.trim().toUpperCase()} saved. It will be applied to your order.`, { duration: 5000 });
    params.delete('coupon');
    const rest = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
  }, [setCouponCode]);

  // Re-check the code whenever the cart, the code or the running sales change
  useEffect(() => {
    if (!couponCode) return;
    const timer = setTimeout(() => { refreshCoupon(); }, 300);
    return () => clearTimeout(timer);
  }, [couponCode, itemsKey, salesKey, refreshCoupon]);
}
