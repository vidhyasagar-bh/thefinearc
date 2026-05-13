import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { FadeIn } from '../components/ui/FadeIn';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../utils/format';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { sendEmail } from '../lib/emailService';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';

interface CheckoutForm {
  email: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const cartTotal = total();

  const [form, setForm] = useState<CheckoutForm>({
    email: '', name: '', address: '', city: '', postal_code: '', country: 'GB',
  });
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  function update(field: keyof CheckoutForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function saveOrder() {
    if (!supabaseConfigured) return;
    try {
      await supabase.from('orders').insert({
        customer_name: form.name,
        customer_email: form.email,
        customer_address: {
          line1: form.address,
          city: form.city,
          postal_code: form.postal_code,
          country: form.country,
        },
        items: items.map(({ artwork, quantity }) => ({
          artwork_id: artwork.id,
          artwork_title: artwork.title,
          quantity,
          price: artwork.price,
        })),
        total: cartTotal,
        payment_status: 'pending',
      });
    } catch {
      // Non-fatal — order still completes in demo mode
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    setProcessing(true);

    const emailData = {
      name: form.name,
      email: form.email,
      customer_address: { line1: form.address, city: form.city, postal_code: form.postal_code, country: form.country },
      items: items.map(({ artwork, quantity }) => ({ artwork_title: artwork.title, quantity, price: artwork.price })),
      total: cartTotal,
    };

    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) {
      // Demo mode — save order then confirm
      await saveOrder();
      await sendEmail('order_confirmation', emailData);
      await new Promise(r => setTimeout(r, 1200));
      setProcessing(false);
      setCompleted(true);
      clearCart();
      return;
    }

    try {
      toast.error('Stripe backend not yet configured. Running in demo mode.');
      await saveOrder();
      await sendEmail('order_confirmation', emailData);
      await new Promise(r => setTimeout(r, 1200));
      setCompleted(true);
      clearCart();
    } catch {
      toast.error('Something went wrong. Please try again.');
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
                Thank you for collecting. We will be in touch at {form.email} to arrange delivery. Your work will be carefully packed and dispatched within 5–7 working days.
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
            <h1 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal mb-10 md:mb-14">
              Checkout
            </h1>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 lg:gap-16">
            {/* Form */}
            <div className="md:col-span-2 order-2 md:order-1">
              <form onSubmit={handleSubmit} className="space-y-10 md:space-y-12">
                <FadeIn>
                  <div className="space-y-6">
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
                  <div className="space-y-6">
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
                    <div className="grid grid-cols-2 gap-5">
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
                  <div className="space-y-4">
                    <h2 className="font-sans text-[10px] tracking-widest uppercase text-art-muted">
                      Payment
                    </h2>
                    <div className="border border-art-pale p-5">
                      <p className="font-sans text-sm text-art-muted">
                        {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
                          ? 'Secure payment via Stripe'
                          : 'Demo mode — no real payment will be processed'}
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
              <div className="space-y-5 bg-cream-50 p-6 md:p-7 md:sticky md:top-32 self-start order-1 md:order-2">
                <h2 className="font-serif text-lg font-light text-art-charcoal">Your Selection</h2>
                <div className="space-y-4">
                  {items.map(({ artwork }) => (
                    <div key={artwork.id} className="flex gap-4">
                      <div className="w-14 h-14 shrink-0 overflow-hidden bg-cream-100">
                        <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-light text-art-charcoal leading-snug">{artwork.title}</p>
                        <p className="font-sans text-xs text-art-muted mt-0.5">{artwork.dimensions}</p>
                      </div>
                      <p className="font-sans text-sm text-art-charcoal shrink-0">{formatPrice(artwork.price)}</p>
                    </div>
                  ))}
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
