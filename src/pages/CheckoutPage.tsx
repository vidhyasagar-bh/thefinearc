import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { FadeIn } from '../components/ui/FadeIn';
import { Button } from '../components/ui/Button';
import { useCartStore, cartKey, unitPrice } from '../store/cartStore';
import { formatPrice } from '../utils/format';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { US_STATES } from '../utils/usStates';
import { EmbeddedPaymentForm } from '../components/checkout/EmbeddedPaymentForm';

interface Rate { provider: string; service: string; token: string; amount: number; days: number | null }
interface Address { street1: string; city: string; state: string; zip: string; country: string }

const selectClass =
  'w-full bg-transparent border-b border-art-light text-art-charcoal font-sans text-sm py-3 focus:outline-none focus:border-art-charcoal';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total } = useCartStore();
  const cartTotal = total();
  const [processing, setProcessing] = useState(false);
  const [config, setConfig] = useState<{ enabled: boolean; countries: string[] } | null>(null);
  const [address, setAddress] = useState<Address>({ street1: '', city: '', state: '', zip: '', country: 'US' });
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [quoting, setQuoting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(r => r.json())
      .then(c => {
        setConfig(c);
        if (c.countries?.length) setAddress(a => ({ ...a, country: c.countries.includes(a.country) ? a.country : c.countries[0] }));
      })
      .catch(() => setConfig({ enabled: false, countries: [] }));
  }, []);

  const cartLines = items.map(i => ({
    artworkId: i.artwork.id,
    variationId: i.variation?.id ?? null,
    quantity: i.quantity,
  }));
  const rate = rates?.find(r => `${r.provider}|${r.token}` === selected);
  const estimatedTotal = cartTotal + (rate?.amount ?? 0);

  function updateAddress(field: keyof Address, value: string) {
    setAddress(prev => ({ ...prev, [field]: value }));
    setRates(null);
    setSelected('');
  }

  async function getRates(e: React.FormEvent) {
    e.preventDefault();
    setQuoting(true);
    try {
      const res = await fetch('/api/shipping-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartLines, address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not get shipping prices.');
      setRates(data.rates);
      setSelected(`${data.rates[0].provider}|${data.rates[0].token}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not get shipping prices.');
    }
    setQuoting(false);
  }

  const onPaymentError = useCallback((message: string) => toast.error(message), []);

  async function handlePay() {
    if (items.length === 0) { navigate('/cart'); return; }
    if (config?.enabled && !rate) { toast.error('Choose a shipping option first.'); return; }
    setProcessing(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartLines,
          ...(config?.enabled && rate ? { shipping: { address, rate: { provider: rate.provider, token: rate.token } } } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.client_secret) {
        console.error('Checkout error:', res.status, data);
        throw new Error(data.detail ? `${data.error} (${data.detail})` : data.error || `Could not start checkout (server replied ${res.status}).`);
      }
      setClientSecret(data.client_secret);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
    setProcessing(false);
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
                  {config?.enabled && (
                    <form onSubmit={getRates} className="space-y-6">
                      <fieldset disabled={Boolean(clientSecret)} className="space-y-6 border-0 p-0 m-0 min-w-0">
                      <h2 className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Where should we ship?</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <Input label="Street address *" value={address.street1} required
                            onChange={e => updateAddress('street1', e.target.value)} />
                        </div>
                        <Input label="City *" value={address.city} required
                          onChange={e => updateAddress('city', e.target.value)} />
                        <div>
                          <label className="block text-[10px] tracking-widest uppercase text-art-muted mb-2 font-sans">
                            {address.country === 'US' ? 'State *' : 'State / region'}
                          </label>
                          {address.country === 'US' ? (
                            <select value={address.state} required onChange={e => updateAddress('state', e.target.value)} className={selectClass}>
                              <option value="">Select…</option>
                              {US_STATES.map(st => <option key={st.code} value={st.code}>{st.name}</option>)}
                            </select>
                          ) : (
                            <Input value={address.state} onChange={e => updateAddress('state', e.target.value)} />
                          )}
                        </div>
                        <Input label={address.country === 'US' ? 'ZIP code *' : 'Postal code *'} value={address.zip} required
                          onChange={e => updateAddress('zip', e.target.value)} />
                        <div>
                          <label className="block text-[10px] tracking-widest uppercase text-art-muted mb-2 font-sans">Country</label>
                          <select value={address.country} onChange={e => updateAddress('country', e.target.value)} className={selectClass}>
                            {config.countries.map(c => <option key={c} value={c}>{c === 'US' ? 'United States' : c}</option>)}
                          </select>
                        </div>
                      </div>
                      <Button type="submit" variant="secondary" size="lg" disabled={quoting} className="w-full sm:w-auto">
                        {quoting ? 'Getting prices…' : rates ? 'Update shipping prices' : 'See shipping options'}
                      </Button>

                      {rates && (
                        <div className="space-y-3 pt-2">
                          <h3 className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Shipping options</h3>
                          {rates.map(r => {
                            const key = `${r.provider}|${r.token}`;
                            return (
                              <label key={key}
                                className={`flex items-center gap-3 border p-4 cursor-pointer transition-colors ${
                                  selected === key ? 'border-art-charcoal' : 'border-art-pale hover:border-art-light'
                                }`}>
                                <input type="radio" name="rate" checked={selected === key} onChange={() => setSelected(key)} />
                                <span className="flex-1 min-w-0">
                                  <span className="block font-sans text-sm text-art-charcoal">{r.provider} {r.service}</span>
                                  {r.days != null && (
                                    <span className="block font-sans text-xs text-art-muted mt-0.5">
                                      Estimated {r.days} business {r.days === 1 ? 'day' : 'days'}
                                    </span>
                                  )}
                                </span>
                                <span className="font-sans text-sm text-art-charcoal">{formatPrice(r.amount, 'USD', 2)}</span>
                              </label>
                            );
                          })}
                          <p className="font-sans text-xs text-art-muted leading-relaxed">
                            This is an estimate based on the address above. You will confirm your details on Stripe's payment page.
                          </p>
                        </div>
                      )}
                      </fieldset>
                    </form>
                  )}

                  <div className="space-y-4">
                    <h2 className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Payment</h2>
                    {clientSecret ? (
                      <div className="space-y-4">
                        <EmbeddedPaymentForm clientSecret={clientSecret} onError={onPaymentError} />
                        <button
                          type="button"
                          onClick={() => setClientSecret(null)}
                          className="font-sans text-xs text-art-muted hover:text-art-charcoal underline underline-offset-4 transition-colors"
                        >
                          Change shipping details
                        </button>
                      </div>
                    ) : (
                      <div className="border border-art-pale p-5 space-y-3">
                        <p className="font-sans text-sm text-art-charcoal">
                          Your card details are entered securely with Stripe on the next step.
                        </p>
                        <p className="font-sans text-xs text-art-muted leading-relaxed">
                          Sales tax, where it applies, is calculated automatically from your shipping address and shown before you pay.
                        </p>
                      </div>
                    )}
                  </div>
                  {!clientSecret && (
                    <Button size="lg" onClick={handlePay} disabled={processing || config === null || (config.enabled && !rate)} className="w-full">
                      <Lock size={14} strokeWidth={1.5} />
                      {processing ? 'Preparing payment…' : `Continue to payment · ${formatPrice(estimatedTotal, 'USD', config?.enabled && rate ? 2 : 0)}`}
                    </Button>
                  )}
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
                        <p className="font-serif text-sm font-light text-art-charcoal leading-snug">{artwork.title}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</p>
                        <p className="font-sans text-xs text-art-muted mt-0.5">{item.variation ? item.variation.options.map(o => `${o.name}: ${o.value}`).join(' · ') : artwork.dimensions}</p>
                      </div>
                      <p className="font-sans text-sm text-art-charcoal shrink-0">{formatPrice(unitPrice(item) * item.quantity)}</p>
                    </div>
                  ); })}
                </div>
                <div className="border-t border-art-pale pt-4 space-y-2">
                  {rate && (
                    <>
                      <div className="flex justify-between font-sans text-sm text-art-muted">
                        <span>Items</span><span>{formatPrice(cartTotal)}</span>
                      </div>
                      <div className="flex justify-between font-sans text-sm text-art-muted">
                        <span>Shipping (est.)</span><span>{formatPrice(rate.amount, 'USD', 2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="font-sans text-[10px] tracking-widest uppercase text-art-muted">
                      {rate ? 'Estimated total' : 'Total'}
                    </span>
                    <span className="font-sans text-base text-art-charcoal">{formatPrice(estimatedTotal, 'USD', rate ? 2 : 0)}</span>
                  </div>
                  {rate && <p className="font-sans text-[11px] text-art-muted">Tax, if any, is added on the next step.</p>}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </Layout>
  );
}
