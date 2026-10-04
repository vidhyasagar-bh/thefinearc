import Stripe from 'stripe';
import { sb } from './_lib/supabase.js';

const ID = /^[0-9a-zA-Z-]{1,64}$/;
const COUNTRIES = (process.env.SHIPPING_COUNTRIES || 'US,CA,GB,AU')
  .split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Payments are not configured.' });

  const lines = req.body?.items;
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 20) {
    return res.status(400).json({ error: 'Your cart is empty or invalid.' });
  }
  for (const l of lines) {
    if (typeof l.artworkId !== 'string' || !ID.test(l.artworkId) ||
        (l.variationId != null && (typeof l.variationId !== 'string' || !ID.test(l.variationId)))) {
      return res.status(400).json({ error: 'Invalid cart item.' });
    }
  }

  try {
    const ids = [...new Set(lines.map(l => l.artworkId))];
    const artworks = await sb(
      `artworks?select=id,title,price,images,availability,quantity,variations&id=in.(${ids.join(',')})`
    );
    const byId = new Map((artworks || []).map(a => [a.id, a]));

    const lineItems = [];
    const metadata = {};
    for (const [i, l] of lines.entries()) {
      const art = byId.get(l.artworkId);
      if (!art || art.availability !== 'available') {
        return res.status(409).json({ error: `"${art?.title ?? 'An item'}" is no longer available.` });
      }
      const variations = Array.isArray(art.variations) ? art.variations : [];
      let price = Number(art.price);
      let stock = art.quantity ?? 1;
      let name = art.title;
      if (variations.length > 0) {
        const v = variations.find(x => x.id === l.variationId);
        if (!v) return res.status(400).json({ error: `Please choose an option for "${art.title}".` });
        price = Number(v.price);
        stock = v.quantity;
        name = `${art.title} (${v.options.map(o => `${o.name}: ${o.value}`).join(', ')})`;
      }
      if (stock < 1) return res.status(409).json({ error: `"${name}" is sold out.` });
      const quantity = Math.max(1, Math.min(Number(l.quantity) || 1, stock, 10));
      const image = art.images?.[0];
      lineItems.push({
        quantity,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(price * 100),
          tax_behavior: 'exclusive',
          product_data: {
            name: name.slice(0, 250),
            ...(image && image.startsWith('https://') && image.length < 2000 ? { images: [image] } : {}),
          },
        },
      });
      metadata[`item_${i}`] = `${art.id}|${l.variationId ?? ''}|${quantity}`;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = process.env.SITE_URL || `${proto}://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: COUNTRIES },
      phone_number_collection: { enabled: true },
      metadata,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout] failed', err);
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
}
