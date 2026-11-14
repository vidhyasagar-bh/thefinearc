import Stripe from 'stripe';
import { sb, hasServiceRole } from './_lib/supabase.js';
import { deliver } from './_lib/mailer.js';

export const config = { api: { bodyParser: false } };

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function fulfill(stripe, sessionId) {
  const existing = await sb(`orders?select=id&stripe_checkout_session_id=eq.${encodeURIComponent(sessionId)}`);
  if (existing && existing.length > 0) return; // already processed

  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  if (session.payment_status !== 'paid') return;

  const lineItems = (await stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 })).data;
  const refs = Object.keys(session.metadata || {})
    .filter(k => k.startsWith('item_'))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)))
    .map(k => session.metadata[k].split('|'));

  const ship = session.collected_information?.shipping_details ?? session.shipping_details ?? null;
  const m = session.metadata ?? {};
  const savedAddress = m.ship_line1
    ? { line1: m.ship_line1, line2: m.ship_line2 || '', city: m.ship_city, state: m.ship_state, postal_code: m.ship_zip, country: m.ship_country }
    : null;
  // Prefer the address entered on our checkout page; Stripe's copy is the fallback
  const addr = savedAddress ?? ship?.address ?? session.customer_details?.address ?? {};
  const items = lineItems.map((li, i) => ({
    artwork_id: refs[i]?.[0] ?? null,
    artwork_title: li.description,
    quantity: li.quantity,
    price: li.quantity ? li.amount_subtotal / 100 / li.quantity : 0,
  }));
  const customerName = m.ship_name || ship?.name || session.customer_details?.name || 'Customer';
  // The price was quoted for the address entered on our checkout page; flag it if they changed it on Stripe's page
  const quotedZip = session.metadata?.ship_zip;
  const shippingNote = quotedZip && (
    String(addr.postal_code ?? '').slice(0, 5).toUpperCase() !== quotedZip.slice(0, 5).toUpperCase() ||
    (addr.country ?? '') !== (session.metadata?.ship_country ?? '')
  ) ? `Shipping was quoted for ${quotedZip} (${session.metadata.ship_country}) but the order is going to ${addr.postal_code ?? '?'} (${addr.country ?? '?'}). Check the shipping cost before sending.` : null;
  const customerEmail = session.customer_details?.email || '';

  try {
    await sb('orders', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_address: {
          line1: addr.line1 ?? '', line2: addr.line2 ?? '', city: addr.city ?? '',
          state: addr.state ?? '', postal_code: addr.postal_code ?? '', country: addr.country ?? '',
        },
        items,
        total: session.amount_total / 100,
        subtotal: session.amount_subtotal / 100,
        tax_amount: (session.total_details?.amount_tax ?? 0) / 100,
        shipping_amount: (session.total_details?.amount_shipping ?? 0) / 100,
        shipping_service: session.metadata?.ship_service ?? null,
        shipping_note: shippingNote,
        payment_status: 'paid',
        stripe_payment_intent_id: session.payment_intent?.id ?? null,
        stripe_checkout_session_id: sessionId,
      }),
    });
  } catch (err) {
    if (err.body?.code === '23505') return; // concurrent delivery — other request owns it
    throw err;
  }

  // Reduce stock only after the order row exists, so webhook retries never double-decrement.
  for (const [artworkId, variationId, qty] of refs) {
    try {
      const [art] = await sb(`artworks?select=id,quantity,variations&id=eq.${artworkId}`);
      if (!art) continue;
      const n = Number(qty) || 1;
      const patch = {};
      if (variationId && Array.isArray(art.variations) && art.variations.length > 0) {
        const variations = art.variations.map(v =>
          v.id === variationId ? { ...v, quantity: Math.max(0, v.quantity - n) } : v
        );
        const total = variations.reduce((s, v) => s + v.quantity, 0);
        Object.assign(patch, { variations, quantity: total, ...(total <= 0 ? { availability: 'sold' } : {}) });
      } else {
        const left = Math.max(0, (art.quantity ?? 1) - n);
        Object.assign(patch, { quantity: left, ...(left <= 0 ? { availability: 'sold' } : {}) });
      }
      await sb(`artworks?id=eq.${artworkId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    } catch (err) {
      console.error('[webhook] stock update failed for', artworkId, err);
    }
  }

  const results = await deliver('order_confirmation', {
    name: customerName,
    email: customerEmail,
    customer_address: { line1: addr.line1, city: addr.city, postal_code: addr.postal_code, country: addr.country },
    items: items.map(i => ({ artwork_title: i.artwork_title, quantity: i.quantity, price: i.price })),
    subtotal: session.amount_subtotal / 100,
    tax: (session.total_details?.amount_tax ?? 0) / 100,
    shipping: (session.total_details?.amount_shipping ?? 0) / 100,
    shipping_service: session.metadata?.ship_service ?? null,
    shipping_note: shippingNote,
    total: session.amount_total / 100,
  });
  console.log('[webhook] order emails:', JSON.stringify(results));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !hasServiceRole()) {
    console.error('[webhook] missing STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).end();
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      await readRaw(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[webhook] signature verification failed', err.message);
    return res.status(400).send('Invalid signature');
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await fulfill(stripe, event.data.object.id);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      console.warn('[webhook] async payment failed for', event.data.object.id);
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] handler error', err);
    return res.status(500).end(); // Stripe will retry
  }
}
