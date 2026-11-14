import Stripe from 'stripe';
import { shippingConfig, validateAddress, quoteFingerprint, verifyRate } from './_lib/shipping.js';
import { validLines, loadArtworks, buildEntries, loadLiveSales, loadCoupon, priceEntries } from './_lib/promos.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Payments are not configured.' });

  const lines = req.body?.items;
  if (!validLines(lines)) return res.status(400).json({ error: 'Your cart is empty or invalid.' });

  try {
    const built = buildEntries(lines, await loadArtworks(lines));
    if (built.error) return res.status(built.status).json({ error: built.error });

    // Sales apply automatically; a coupon is checked again here, so the price can only come from the server
    const code = String(req.body?.coupon || '').trim();
    const coupon = code ? await loadCoupon(code) : null;
    if (code && !coupon) return res.status(400).json({ error: 'That code is not valid.', coupon_error: true });
    const priced = priceEntries(built.entries, await loadLiveSales(), coupon);
    if (priced.couponError) return res.status(400).json({ error: priced.couponError, coupon_error: true });

    const lineItems = [];
    const metadata = {};
    for (const e of priced.entries) {
      const image = e.art.images?.[0];
      lineItems.push({
        quantity: e.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: e.finalUnitCents,
          tax_behavior: 'exclusive',
          product_data: {
            name: e.name.slice(0, 250),
            ...(image && image.startsWith('https://') && image.length < 2000 ? { images: [image] } : {}),
          },
        },
      });
      metadata[`item_${e.i}`] = `${e.art.id}|${e.variationId ?? ''}|${e.quantity}`;
    }
    if (coupon) Object.assign(metadata, { coupon: coupon.code, discount_cents: String(priced.discountCents) });

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
    // What Stripe will charge for the items (cents), so the page can tell if its own total has drifted
    const itemsTotal = priced.itemsTotalCents;
    return res.status(200).json({ client_secret: clientSecret, items_total: itemsTotal });
  } catch (err) {
    console.error('[checkout] failed', err.type, err.code, err.param, err.message);
    // Stripe's own message (for example which parameter it rejected) contains nothing sensitive and speeds up fixing setup problems
    const detail = typeof err?.type === 'string' && err.type.startsWith('Stripe') ? String(err.message).slice(0, 300) : undefined;
    return res.status(500).json({ error: 'Could not start checkout. Please try again.', detail });
  }
}
