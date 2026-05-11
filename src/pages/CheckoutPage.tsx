import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { FadeIn } from '../components/ui/FadeIn';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../utils/format';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';

interface CheckoutForm {
  email: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const cartTotal = total();

  const [form, setForm] = useState<CheckoutForm>({
    email: '', name: '', address: '', city: '', state: '', postal_code: '', country: 'GB',
  });
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  function update(field: keyof CheckoutForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) {
      // Demo mode
      setProcessing(true);
      await new Promise(r => setTimeout(r, 1500));
      setProcessing(false);
      setCompleted(true);
      clearCart();
      return;
    }

    setProcessing(true);
    try {
      toast.error('Please configure your Stripe backend to process payments.');
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  if (items.length === 0 && !completed) {
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

  if (completed) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-6">
          <FadeIn>
            <div className="max-w-md mx-auto text-center space-y-7">
              <CheckCircle size={40} strokeWidth={1} className="text-art-warm mx-auto" />
              <h1 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal">
                Order confirmed.
              </h1>
              <p className="font-sans text-sm text-art-muted leading-relaxed">
                Thank you for collecting. A confirmation has been sent to {form.email}. Your work will be carefully packed and dispatched within 5–7 working days.
              </p>
              <div className="w-8 h-px bg-art-light mx-auto" />
              <Link to="/gallery">
                <Button variant="secondary" size="lg">Continue Browsing</Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pt-32 md:pt-40 pb-24 px-6 md:px-12 lg:px-20 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <h1 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal mb-14">
              Checkout
            </h1>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-12">
                <FadeIn>
                  <div className="space-y-7">
                    <h2 className="font-sans text-[10px] tracking-widest uppercase text-art-muted">
                      Contact
                    </h2>
                    <Input
                      label="Email address *"
                      type="email"
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      required
                    />
                  </div>
                </FadeIn>

                <FadeIn delay={0.1}>
                  <div className="space-y-7">
                    <h2 className="font-sans text-[10px] tracking-widest uppercase text-art-muted">
                      Shipping Address
                    </h2>
                    <Input
                      label="Full name *"
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      required
                    />
                    <Input
                      label="Address *"
                      value={form.address}
                      onChange={e => update('address', e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-2 gap-6">
                      <Input
                        label="City *"
                        value={form.city}
                        onChange={e => update('city', e.target.value)}
                        required
                      />
                      <Input
                        label="Postal code *"
                        value={form.postal_code}
                        onChange={e => update('postal_code', e.target.value)}
                        required
                      />
                    </div>
                    <Input
                      label="Country *"
                      value={form.country}
                      onChange={e => update('country', e.target.value)}
                      required
                    />
                  </div>
                </FadeIn>

                <FadeIn delay={0.15}>
                  <div className="space-y-5">
                    <h2 className="font-sans text-[10px] tracking-widest uppercase text-art-muted">
                      Payment
                    </h2>
                    <div className="border border-art-pale p-5">
                      <p className="font-sans text-sm text-art-muted">
                        {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
                          ? 'Secure payment via Stripe'
                          : '⚠ Demo mode — no real payment will be processed'}
                      </p>
                    </div>
                  </div>
                </FadeIn>

                <Button
                  type="submit"
                  size="lg"
                  disabled={processing}
                  className="w-full"
                >
                  {processing ? 'Processing...' : `Place Order · ${formatPrice(cartTotal)}`}
                </Button>
              </form>
            </div>

            {/* Summary */}
            <FadeIn delay={0.2}>
              <div className="space-y-6 bg-cream-50 p-7 lg:sticky lg:top-32 self-start">
                <h2 className="font-serif text-lg font-light text-art-charcoal">Your Selection</h2>
                <div className="space-y-5">
                  {items.map(({ artwork, quantity }) => (
                    <div key={artwork.id} className="flex gap-4">
                      <div className="w-16 h-16 shrink-0 overflow-hidden bg-cream-100">
                        <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-light text-art-charcoal truncate">{artwork.title}</p>
                        <p className="font-sans text-xs text-art-muted">× {quantity}</p>
                      </div>
                      <p className="font-sans text-sm text-art-charcoal shrink-0">{formatPrice(artwork.price * quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-art-pale pt-5 flex justify-between">
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
