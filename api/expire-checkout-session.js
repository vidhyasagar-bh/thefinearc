import Stripe from 'stripe';

// Closes a payment session that is out of date (prices or stock changed) so it can no longer be paid.
// Only the holder of the session's client secret can do this.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Payments are not configured.' });

  const match = /^(cs_(?:test|live)_[A-Za-z0-9]+)_secret_[A-Za-z0-9_]+$/.exec(String(req.body?.client_secret || ''));
  if (!match) return res.status(400).json({ error: 'Invalid request.' });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' });
    await stripe.checkout.sessions.expire(match[1]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    // Already paid, already expired, or unknown: nothing more to do
    console.warn('[expire-checkout] could not expire', match[1], err.message);
    return res.status(200).json({ ok: false });
  }
}
