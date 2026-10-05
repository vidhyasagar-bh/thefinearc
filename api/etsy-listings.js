import { getAccessToken } from './_lib/etsyAuth.js';

const RESOURCES = new Set(['images', 'videos', 'inventory', 'variation-images']);
// These need an OAuth access token (scope listings_r), not just the API key
const NEEDS_TOKEN = new Set(['inventory', 'variation-images']);

export default async function handler(req, res) {
  const apiKey = req.headers['x-etsy-key'] || process.env.ETSY_API_KEY;
  const shopId = req.query.shopId || process.env.ETSY_SHOP_ID;

  if (!apiKey || !shopId) {
    return res.status(400).json({ error: 'Missing Etsy API key or shop ID' });
  }
  if (!/^\d+$/.test(String(shopId))) {
    return res.status(400).json({ error: 'Shop ID must be numeric' });
  }

  const { listingId, resource } = req.query;
  let url;
  if (listingId) {
    if (!/^\d+$/.test(String(listingId))) {
      return res.status(400).json({ error: 'Listing ID must be numeric' });
    }
    const r = resource || 'images';
    if (!RESOURCES.has(String(r))) {
      return res.status(400).json({ error: 'Unsupported resource' });
    }
    url = r === 'variation-images'
      ? `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/variation-images`
      : `https://openapi.etsy.com/v3/application/listings/${listingId}/${r}`;
  } else {
    url = `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=100&includes=Images,Videos,Inventory,Shipping`;
  }
  console.log('[etsy-listings] GET', url);

  const headers = { 'x-api-key': String(apiKey) };
  if (listingId && NEEDS_TOKEN.has(String(resource))) {
    try {
      const token = await getAccessToken();
      if (!token) {
        return res.status(401).json({ error: 'Etsy is not connected. Use "Connect Etsy" in the import window.', needs_connect: true });
      }
      headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.error('[etsy-listings] token error', err);
      return res.status(401).json({ error: `Etsy sign-in expired or failed (${String(err.message).slice(0, 150)}). Use "Connect Etsy" again.`, needs_connect: true });
    }
  }

  try {
    const etsyRes = await fetch(url, { method: 'GET', headers });
    const body = await etsyRes.text();
    console.log('[etsy-listings] Etsy status:', etsyRes.status, body.slice(0, 300));
    res.setHeader('Content-Type', 'application/json');
    return res.status(etsyRes.status).send(body);
  } catch (err) {
    console.error('[etsy-listings] fetch failed:', err);
    return res.status(502).json({ error: 'Failed to reach Etsy', detail: String(err) });
  }
}
