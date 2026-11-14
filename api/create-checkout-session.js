import Stripe from 'stripe';
import { sb } from './_lib/supabase.js';
import { shippingConfig, validateAddress, quoteFingerprint, verifyRate } from './_lib/shipping.js';

const ID = /^[0-9a-zA-Z-]{1,64}$/;

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

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' });

    // Shipping: the price must be one we quoted for exactly this cart and address (signed when it was shown)
    const cfg = shippingConfig();
    let customerId;
    let shippingOptions;
    let allowedCountries = cfg.countries;
    if (cfg.enabled) {
      const checked = validateAddress(req.body?.shipping?.address, cfg.countries);
      if (checked.error) return res.status(400).json({ error: checked.error });
      const chosen = verifyRate(req.body?.shipping?.rate, quoteFingerprint(lines, checked.address));
      if (!chosen) return res.status(409).json({ error: 'Your shipping price has expired or your cart changed. Please choose your shipping option again.' });
      const days = chosen.days ? Math.max(1, Math.round(chosen.days)) : null;
      shippingOptions = [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: Math.round(chosen.amount * 100), currency: 'usd' },
          display_name: `${chosen.provider} ${chosen.service}`.slice(0, 100),
          tax_behavior: 'exclusive',
          tax_code: 'txcd_92010001',
          ...(days ? { delivery_estimate: { minimum: { unit: 'business_day', value: days }, maximum: { unit: 'business_day', value: days } } } : {}),
        },
      }];
      Object.assign(metadata, {
        ship_service: `${chosen.provider} ${chosen.service}`.slice(0, 100),
        ship_amount: String(chosen.amount),
        ship_zip: checked.address.zip,
        ship_state: checked.address.state,
        ship_country: checked.address.country,
      });
      allowedCountries = [checked.address.country];

      // Hand Stripe the address already entered on our page: tax is worked out from it and the payment form won't ask again
      const a = checked.address;
      const stripeAddress = {
        line1: a.street1, ...(a.street2 ? { line2: a.street2 } : {}),
        city: a.city, state: a.state, postal_code: a.zip, country: a.country,
      };
      const customer = await stripe.customers.create({
        ...(a.name ? { name: a.name } : {}),
        address: stripeAddress,
        shipping: { name: a.name || 'Customer', address: stripeAddress },
      });
      customerId = customer.id;
      // Kept on the session too, so the order record never depends on what Stripe echoes back
      Object.assign(metadata, {
        ship_name: a.name, ship_line1: a.street1, ship_line2: a.street2, ship_city: a.city,
      });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = process.env.SITE_URL || `${proto}://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'form',
      mode: 'payment',
      line_items: lineItems,
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      ...(customerId ? { customer: customerId } : { shipping_address_collection: { allowed_countries: allowedCountries } }),
      ...(shippingOptions ? { shipping_options: shippingOptions } : {}),
      phone_number_collection: { enabled: false },
      submit_type: 'auto',
      integration_identifier: 'custom_embedded_web_0001',
      metadata,
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    });
    const clientSecret = session.client_secret;
    if (!clientSecret) {
      console.error('[checkout] session created without client_secret', session.id, session.ui_mode, Object.keys(session).join(','));
      return res.status(502).json({
        error: 'Could not start checkout. Please try again.',
        detail: `Stripe created the session (${session.id}, ui_mode ${session.ui_mode}) but sent no client secret. Fields returned: ${Object.keys(session).join(', ')}`.slice(0, 400),
      });
    }
    return res.status(200).json({ client_secret: clientSecret });
  } catch (err) {
    console.error('[checkout] failed', err.type, err.code, err.param, err.message);
    // Stripe's own message (for example which parameter it rejected) contains nothing sensitive and speeds up fixing setup problems
    const detail = typeof err?.type === 'string' && err.type.startsWith('Stripe') ? String(err.message).slice(0, 300) : undefined;
    return res.status(500).json({ error: 'Could not start checkout. Please try again.', detail });
  }
}
