import { shippingConfig, validateAddress, buildParcel, quoteRates } from './_lib/shipping.js';
import { hasServiceRole } from './_lib/supabase.js';

const ID = /^[0-9a-zA-Z-]{1,64}$/;

export default async function handler(req, res) {
  const cfg = shippingConfig();
  if (req.method === 'GET') return res.status(200).json(cfg);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!cfg.enabled || !hasServiceRole()) return res.status(503).json({ error: 'Shipping estimates are not set up yet.' });

  const lines = req.body?.items;
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 20 ||
      lines.some(l => typeof l?.artworkId !== 'string' || !ID.test(l.artworkId))) {
    return res.status(400).json({ error: 'Your cart is empty or invalid.' });
  }
  const checked = validateAddress(req.body?.address, cfg.countries);
  if (checked.error) return res.status(400).json({ error: checked.error });

  try {
    const parcel = await buildParcel(lines);
    const rates = await quoteRates({ address: checked.address, parcel });
    if (rates.length === 0) return res.status(422).json({ error: 'No shipping options were found for that address. Please check it and try again.' });
    return res.status(200).json({ rates });
  } catch (err) {
    console.error('[shipping-rates] failed', err);
    return res.status(502).json({ error: 'Could not get shipping prices right now. Please try again.' });
  }
}
