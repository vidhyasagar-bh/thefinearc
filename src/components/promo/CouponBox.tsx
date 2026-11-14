import { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../utils/format';

// "Have a code?" box for the cart
export function CouponBox() {
  const couponCode = useCartStore(s => s.couponCode);
  const couponDiscount = useCartStore(s => s.couponDiscount);
  const couponError = useCartStore(s => s.couponError);
  const setCouponCode = useCartStore(s => s.setCouponCode);
  const removeCoupon = useCartStore(s => s.removeCoupon);
  const refreshCoupon = useCartStore(s => s.refreshCoupon);
  const [input, setInput] = useState('');
  const [checking, setChecking] = useState(false);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setChecking(true);
    setCouponCode(input);
    await refreshCoupon();
    setChecking(false);
    setInput('');
  }

  if (couponCode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 bg-green-50 px-3 py-2">
          <p className="font-sans text-xs text-green-800">
            <span className="font-medium tracking-wide">{couponCode}</span>
            {couponDiscount > 0 && <> — you save {formatPrice(couponDiscount, 'USD', 2)}</>}
          </p>
          <button type="button" onClick={removeCoupon}
            className="font-sans text-[11px] text-art-muted hover:text-art-charcoal underline underline-offset-2 shrink-0">
            Remove
          </button>
        </div>
        {couponError && <p className="font-sans text-xs text-red-600 leading-relaxed">{couponError}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={apply} className="flex gap-2">
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Discount code"
        aria-label="Discount code"
        autoCapitalize="characters"
        className="flex-1 min-w-0 bg-transparent border-b border-art-light text-art-charcoal font-sans text-sm py-2 placeholder:text-art-muted focus:outline-none focus:border-art-charcoal"
      />
      <button type="submit" disabled={checking || !input.trim()}
        className="font-sans text-[11px] tracking-widest uppercase text-art-charcoal border border-art-light px-4 hover:border-art-charcoal transition-colors disabled:opacity-40">
        {checking ? '…' : 'Apply'}
      </button>
    </form>
  );
}
