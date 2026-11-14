import { hasServiceRole } from './_lib/supabase.js';
import { validLines, loadArtworks, buildEntries, loadLiveSales, loadCoupon, priceEntries } from './_lib/promos.js';

// Best-effort guard against guessing codes (per warm server instance)
const misses = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_MISSES = 12;

// Checks a code against the cart and says how much it takes off. The checkout repeats this check when the customer pays.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!hasServiceRole()) return res.status(503).json({ ok: false, error: 'Codes are not available right now.' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const entry = misses.get(ip) ?? { count: 0, first: Date.now() };
  if (Date.now() - entry.first > WINDOW_MS) { entry.count = 0; entry.first = Date.now(); }
  if (entry.count >= MAX_MISSES) return res.status(429).json({ ok: false, error: 'Too many attempts. Please try again in a few minutes.' });

  const lines = req.body?.items;
  if (!validLines(lines)) return res.status(400).json({ ok: false, error: 'Your cart is empty or invalid.' });

  const fail = async (message, countMiss = true) => {
    if (countMiss) { misses.set(ip, { ...entry, count: entry.count + 1 }); await new Promise(r => setTimeout(r, 400)); }
    return res.status(200).json({ ok: false, error: message });
  };

  try {
    const coupon = await loadCoupon(req.body?.code);
    if (!coupon) return fail('That code is not valid.');

    const built = buildEntries(lines, await loadArtworks(lines));
    if (built.error) return fail(built.error, false);

    const priced = priceEntries(built.entries, await loadLiveSales(), coupon);
    if (priced.couponError) return fail(priced.couponError);

    misses.delete(ip);
    return res.status(200).json({
      ok: true,
      code: coupon.code,
      discount_cents: priced.discountCents,
      items_total_cents: priced.itemsTotalCents,
      sale_subtotal_cents: priced.saleSubtotalCents,
    });
  } catch (err) {
    console.error('[coupon] failed', err);
    return res.status(500).json({ ok: false, error: 'Could not check that code. Please try again.' });
  }
}
