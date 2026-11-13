import { sb, hasServiceRole, supabaseBase, authHeaders } from './_lib/supabase.js';
import { adminConfigured, passwordOk, issueSession, clearSession, isAdmin } from './_lib/adminAuth.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARTWORK_FIELDS = [
  'title', 'description', 'story', 'price', 'dimensions', 'materials', 'category', 'images', 'video_url',
  'availability', 'framing', 'year', 'quantity', 'tags', 'variations', 'etsy_url', 'etsy_listing_id', 'etsy_data',
];
const AVAILABILITY = ['available', 'sold', 'reserved'];
const FULFILMENT = ['processing', 'confirmed', 'preparing', 'shipped', 'delivered'];
const COMMISSION = ['pending', 'accepted', 'declined'];
const BUCKETS = ['artwork-images', 'artwork-videos'];

// Best-effort brute-force guard (per warm server instance)
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;

class BadRequest extends Error {}

function pickArtwork(input) {
  const out = {};
  for (const k of ARTWORK_FIELDS) if (input && k in input) out[k] = input[k];
  if ('availability' in out && !AVAILABILITY.includes(out.availability)) throw new BadRequest('Invalid availability.');
  if ('category' in out) out.category = String(out.category || '').trim().toLowerCase();
  if ('images' in out && !(Array.isArray(out.images) && out.images.every(i => typeof i === 'string'))) throw new BadRequest('Invalid images.');
  if ('variations' in out && !Array.isArray(out.variations)) throw new BadRequest('Invalid variations.');
  return out;
}

export default async function handler(req, res) {
  const action = String(req.query.action || '');
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

  if (req.method === 'GET' && action === 'session') {
    return res.status(200).json({ authed: isAdmin(req), configured: adminConfigured() });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // A JSON content type can't be sent cross-site without a CORS preflight, which blocks forged requests
  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ error: 'JSON required.' });
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  if (action === 'login') {
    if (!adminConfigured()) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set on the server.' });
    const entry = attempts.get(ip) ?? { count: 0, first: Date.now() };
    if (Date.now() - entry.first > WINDOW_MS) { entry.count = 0; entry.first = Date.now(); }
    if (entry.count >= MAX_ATTEMPTS) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
    if (!passwordOk(body.password)) {
      attempts.set(ip, { ...entry, count: entry.count + 1 });
      await new Promise(r => setTimeout(r, 700));
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    attempts.delete(ip);
    issueSession(res);
    return res.status(200).json({ ok: true });
  }
  if (action === 'logout') {
    clearSession(res);
    return res.status(200).json({ ok: true });
  }

  if (!isAdmin(req)) return res.status(401).json({ error: 'Not signed in.' });
  if (!hasServiceRole()) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server.' });

  try {
    switch (action) {
      case 'artworks.list':
        return res.status(200).json({ data: await sb('artworks?select=*&order=created_at.desc') });

      case 'artworks.save': {
        const payload = pickArtwork(body.payload);
        if (body.id) {
          if (!UUID.test(String(body.id))) return res.status(400).json({ error: 'Invalid id.' });
          await sb(`artworks?id=eq.${body.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else {
          await sb('artworks', { method: 'POST', body: JSON.stringify(payload) });
        }
        return res.status(200).json({ ok: true });
      }

      case 'artworks.delete':
        if (!UUID.test(String(body.id))) return res.status(400).json({ error: 'Invalid id.' });
        await sb(`artworks?id=eq.${body.id}`, { method: 'DELETE' });
        return res.status(200).json({ ok: true });

      // Create or refresh one listing imported from Etsy. A re-import keeps your section, story, framing and year.
      case 'artworks.etsy': {
        const payload = pickArtwork(body.payload);
        const listingId = Number(payload.etsy_listing_id);
        if (!Number.isInteger(listingId) || listingId <= 0) return res.status(400).json({ error: 'Invalid Etsy listing.' });
        const category = String(body.category || '').trim().toLowerCase();
        const [existing] = await sb(`artworks?select=id&etsy_listing_id=eq.${listingId}`);
        if (existing) {
          await sb(`artworks?id=eq.${existing.id}`, {
            method: 'PATCH', body: JSON.stringify(category ? { ...payload, category } : { ...payload, category: undefined }),
          });
          return res.status(200).json({ ok: true, updated: true });
        }
        if (!category) return res.status(400).json({ error: 'Choose a section for new listings.' });
        await sb('artworks', {
          method: 'POST',
          body: JSON.stringify({ story: null, framing: null, year: new Date().getFullYear(), ...payload, category }),
        });
        return res.status(200).json({ ok: true, updated: false });
      }

      case 'orders.list':
        return res.status(200).json({ data: await sb('orders?select=*&order=created_at.desc') });

      case 'orders.update':
        if (!UUID.test(String(body.id)) || !FULFILMENT.includes(body.fulfillment_status)) {
          return res.status(400).json({ error: 'Invalid order update.' });
        }
        await sb(`orders?id=eq.${body.id}`, { method: 'PATCH', body: JSON.stringify({ fulfillment_status: body.fulfillment_status }) });
        return res.status(200).json({ ok: true });

      case 'commissions.list':
        return res.status(200).json({ data: await sb('commission_inquiries?select=*&order=created_at.desc') });

      case 'commissions.update':
        if (!UUID.test(String(body.id)) || !COMMISSION.includes(body.status)) {
          return res.status(400).json({ error: 'Invalid commission update.' });
        }
        await sb(`commission_inquiries?id=eq.${body.id}`, { method: 'PATCH', body: JSON.stringify({ status: body.status }) });
        return res.status(200).json({ ok: true });

      case 'analytics': {
        const [artworks, orders, commissions] = await Promise.all([
          sb('artworks?select=availability'),
          sb('orders?select=*&order=created_at.desc'),
          sb('commission_inquiries?select=status'),
        ]);
        return res.status(200).json({ artworks, orders, commissions });
      }

      // Hands the browser a one-time upload slot so large files go straight to storage
      case 'upload.sign': {
        const bucket = String(body.bucket || '');
        const ext = String(body.ext || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
        if (!BUCKETS.includes(bucket)) return res.status(400).json({ error: 'Invalid bucket.' });
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const r = await fetch(`${supabaseBase()}/storage/v1/object/upload/sign/${bucket}/${path}`, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: '{}',
        });
        const text = await r.text();
        if (!r.ok) throw new Error(`Storage ${r.status}: ${text.slice(0, 200)}`);
        const token = new URL(JSON.parse(text).url, 'https://x.invalid').searchParams.get('token');
        return res.status(200).json({
          path, token, publicUrl: `${supabaseBase()}/storage/v1/object/public/${bucket}/${path}`,
        });
      }

      default:
        return res.status(400).json({ error: 'Unknown action.' });
    }
  } catch (err) {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    console.error('[admin]', action, err);
    return res.status(500).json({ error: String(err.message || err).slice(0, 300) });
  }
}
