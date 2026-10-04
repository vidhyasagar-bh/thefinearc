import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { FadeIn } from '../components/ui/FadeIn';
import { Button } from '../components/ui/Button';
import { useCartStore, cartKey, unitPrice } from '../store/cartStore';
import { formatPrice } from '../utils/format';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total } = useCartStore();
  const cartTotal = total();
  const [processing, setProcessing] = useState(false);

  async function handlePay() {
    if (items.length === 0) { navigate('/cart'); return; }
    setProcessing(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            artworkId: i.artwork.id,
            variationId: i.variation?.id ?? null,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      window.location.assign(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-5">
            <p className="font-serif text-2xl font-light text-art-muted">Your cart is empty.</p>
            <Link to="/gallery"><Button variant="secondary">Browse Gallery</Button></Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pt-32 md:pt-40 pb-24 px-6 md:px-12 lg:px-20 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <h1 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal mb-10 md:mb-14">
              Checkout
            </h1>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 lg:gap-16">
            <div className="md:col-span-2 order-2 md:order-1">
              <FadeIn>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Payment</h2>
                    <div className="border border-art-pale p-5 space-y-3">
                      <p className="font-sans text-sm text-art-charcoal">
                        You will enter your shipping address and card details on Stripe's secure payment page.
                      </p>
                      <p className="font-sans text-xs text-art-muted leading-relaxed">
                        Sales tax, where it applies, is calculated automatically from your shipping address and shown before you pay.
                      </p>
                    </div>
                  </div>
                  <Button size="lg" onClick={handlePay} disabled={processing} className="w-full">
                    <Lock size={14} strokeWidth={1.5} />
                    {processing ? 'Redirecting…' : `Continue to payment · ${formatPrice(cartTotal)}`}
                  </Button>
                </div>
              </FadeIn>
            </div>

            {/* Summary */}
            <FadeIn delay={0.2}>
              <div className="space-y-5 bg-cream-50 p-6 md:p-7 md:sticky md:top-32 self-start order-1 md:order-2">
                <h2 className="font-serif text-lg font-light text-art-charcoal">Your Selection</h2>
                <div className="space-y-4">
                  {items.map((item) => { const { artwork } = item; return (
                    <div key={cartKey(item)} className="flex gap-4">
                      <div className="w-14 h-14 shrink-0 overflow-hidden bg-cream-100">
                        <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-light text-art-charcoal leading-snug">{artwork.title}</p>
                        <p className="font-sans text-xs text-art-muted mt-0.5">{item.variation ? item.variation.options.map(o => `${o.name}: ${o.value}`).join(' · ') : artwork.dimensions}</p>
                      </div>
                      <p className="font-sans text-sm text-art-charcoal shrink-0">{formatPrice(unitPrice(item))}</p>
                    </div>
                  ); })}
                </div>
                <div className="border-t border-art-pale pt-4 flex justify-between">
                  <span className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Total</span>
                  <span className="font-sans text-base text-art-charcoal">{formatPrice(cartTotal)}</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </Layout>
  );
}
