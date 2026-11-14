import { sb, hasServiceRole, supabaseBase, authHeaders } from './_lib/supabase.js';
import { adminConfigured, passwordOk, issueSession, clearSession, isAdmin } from './_lib/adminAuth.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARTWORK_FIELDS = [
  'title', 'description', 'story', 'price', 'dimensions', 'materials', 'category', 'images', 'video_url',
  'availability', 'framing', 'year', 'quantity', 'tags', 'variations', 'etsy_url', 'etsy_listing_id', 'etsy_data',
  'weight_oz', 'dim_length', 'dim_width', 'dim_depth', 'dim_unit', 'etsy_sync',
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

const SCOPES = ['all', 'sections', 'items'];
const TYPES = ['percent', 'amount'];

// Shared checks for sales and coupons
function pickPromo(input, { coupon }) {
  const i = input && typeof input === 'object' ? input : {};
  const out = {};
  if (!TYPES.includes(i.discount_type)) throw new BadRequest('Choose percent off or amount off.');
  out.discount_type = i.discount_type;
  const value = Number(i.discount_value);
  if (!(value > 0)) throw new BadRequest('Enter a discount greater than zero.');
  if (i.discount_type === 'percent' && value > 95) throw new BadRequest('Percent off can be at most 95.');
  if (i.discount_type === 'amount' && value > 100000) throw new BadRequest('That discount is too large.');
  out.discount_value = Math.round(value * 100) / 100;
  if (!SCOPES.includes(i.applies_to)) throw new BadRequest('Choose what the discount applies to.');
  out.applies_to = i.applies_to;
  out.sections = Array.isArray(i.sections) ? i.sections.map(x => String(x).trim().toLowerCase()).filter(Boolean).slice(0, 100) : [];
  out.artwork_ids = Array.isArray(i.artwork_ids) ? i.artwork_ids.map(String).filter(x => UUID.test(x)).slice(0, 500) : [];
  if (out.applies_to === 'sections' && out.sections.length === 0) throw new BadRequest('Choose at least one section.');
  if (out.applies_to === 'items' && out.artwork_ids.length === 0) throw new BadRequest('Choose at least one listing.');
  for (const key of ['starts_at', 'ends_at']) {
    if (i[key]) {
      if (Number.isNaN(Date.parse(i[key]))) throw new BadRequest('Invalid date.');
      out[key] = new Date(i[key]).toISOString();
    } else out[key] = null;
  }
  if (out.starts_at && out.ends_at && Date.parse(out.ends_at) <= Date.parse(out.starts_at)) throw new BadRequest('The end must be after the start.');
  out.active = i.active !== false;
  if (coupon) {
    const code = String(i.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new BadRequest('Codes use 3-40 letters, numbers, dashes or underscores.');
    out.code = code;
    const min = Number(i.min_subtotal || 0);
    if (!(min >= 0)) throw new BadRequest('Invalid minimum order.');
    out.min_subtotal = Math.round(min * 100) / 100;
    out.exclude_sale_items = Boolean(i.exclude_sale_items);
    if (i.max_redemptions === null || i.max_redemptions === '' || i.max_redemptions === undefined) out.max_redemptions = null;
    else {
      const max = Math.floor(Number(i.max_redemptions));
      if (!(max >= 1)) throw new BadRequest('The usage limit must be at least 1.');
      out.max_redemptions = max;
    }
  } else {
    const name = String(i.name || '').trim();
    if (!name) throw new BadRequest('Give the sale a name.');
    out.name = name.slice(0, 100);
  }
  return out;
}

// Turns a duplicate-code database error into a readable message
function duplicateAware(err) {
  if (err?.body?.code === '23505') throw new BadRequest('That code already exists.');
  throw err;
}

function pickArtwork(input) {
  const out = {};
  for (const k of ARTWORK_FIELDS) if (input && k in input) out[k] = input[k];
  if ('availability' in out && !AVAILABILITY.includes(out.availability)) throw new BadRequest('Invalid availability.');
  if ('category' in out) out.category = String(out.category || '').trim().toLowerCase();
  if ('images' in out && !(Array.isArray(out.images) && out.images.every(i => typeof i === 'string'))) throw new BadRequest('Invalid images.');
  if ('variations' in out && !Array.isArray(out.variations)) throw new BadRequest('Invalid variations.');
  if ('dim_unit' in out && !['in', 'cm'].includes(out.dim_unit)) throw new BadRequest('Choose inches or centimetres.');
  for (const k of ['dim_length', 'dim_width', 'dim_depth', 'weight_oz']) {
    if (k in out && out[k] !== null && !(Number(out[k]) > 0)) throw new BadRequest('Sizes and weight must be greater than zero.');
  }
  if ('etsy_sync' in out) out.etsy_sync = Boolean(out.etsy_sync);
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

      // Create or refresh one listing imported from Etsy. A refresh keeps your section, story, framing and year.
      // Listings with "keep in sync" switched off are skipped unless force is set (an explicit click on that listing).
      case 'artworks.etsy': {
        const payload = pickArtwork(body.payload);
        delete payload.etsy_sync; // never taken from the Etsy payload
        const listingId = Number(payload.etsy_listing_id);
        if (!Number.isInteger(listingId) || listingId <= 0) return res.status(400).json({ error: 'Invalid Etsy listing.' });
        const category = String(body.category || '').trim().toLowerCase();
        const [existing] = await sb(`artworks?select=id,etsy_sync&etsy_listing_id=eq.${listingId}`);
        const stamp = { etsy_synced_at: new Date().toISOString() };
        if (existing) {
          if (existing.etsy_sync === false && !body.force) return res.status(200).json({ ok: true, skipped: true });
          await sb(`artworks?id=eq.${existing.id}`, {
            method: 'PATCH', body: JSON.stringify({ ...payload, ...stamp, ...(category ? { category } : { category: undefined }) }),
          });
          return res.status(200).json({ ok: true, updated: true });
        }
        if (!category) return res.status(400).json({ error: 'Choose a section for new listings.' });
        await sb('artworks', {
          method: 'POST',
          body: JSON.stringify({ story: null, framing: null, year: new Date().getFullYear(), ...payload, ...stamp, etsy_sync: true, category }),
        });
        return res.status(200).json({ ok: true, updated: false });
      }

      case 'sales.list':
        return res.status(200).json({ data: await sb('sales?select=*&order=created_at.desc') });

      case 'sales.save': {
        const payload = pickPromo(body.payload, { coupon: false });
        if (body.id) {
          if (!UUID.test(String(body.id))) return res.status(400).json({ error: 'Invalid id.' });
          await sb(`sales?id=eq.${body.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        } else await sb('sales', { method: 'POST', body: JSON.stringify(payload) });
        return res.status(200).json({ ok: true });
      }

      case 'sales.delete':
        if (!UUID.test(String(body.id))) return res.status(400).json({ error: 'Invalid id.' });
        await sb(`sales?id=eq.${body.id}`, { method: 'DELETE' });
        return res.status(200).json({ ok: true });

      case 'coupons.list':
        return res.status(200).json({ data: await sb('coupons?select=*&order=created_at.desc') });

      case 'coupons.save': {
        const payload = pickPromo(body.payload, { coupon: true });
        try {
          if (body.id) {
            if (!UUID.test(String(body.id))) return res.status(400).json({ error: 'Invalid id.' });
            await sb(`coupons?id=eq.${body.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
          } else await sb('coupons', { method: 'POST', body: JSON.stringify(payload) });
        } catch (err) { duplicateAware(err); }
        return res.status(200).json({ ok: true });
      }

      case 'coupons.delete':
        if (!UUID.test(String(body.id))) return res.status(400).json({ error: 'Invalid id.' });
        await sb(`coupons?id=eq.${body.id}`, { method: 'DELETE' });
        return res.status(200).json({ ok: true });

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
