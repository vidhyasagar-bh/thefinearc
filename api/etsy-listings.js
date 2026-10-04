export default async function handler(req, res) {
  const apiKey = req.headers['x-etsy-key'] || process.env.ETSY_API_KEY;
  const shopId = req.query.shopId || process.env.ETSY_SHOP_ID;

  if (!apiKey || !shopId) {
    return res.status(400).json({ error: 'Missing Etsy API key or shop ID' });
  }
  if (!/^\d+$/.test(String(shopId))) {
    return res.status(400).json({ error: 'Shop ID must be numeric' });
  }

  const listingId = req.query.listingId;
  if (listingId && !/^\d+$/.test(String(listingId))) {
    return res.status(400).json({ error: 'Listing ID must be numeric' });
  }
  const url = listingId
    ? `https://openapi.etsy.com/v3/application/listings/${listingId}/images`
    : `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=100&includes=Images`;
  console.log('[etsy-listings] GET', url);

  try {
    const etsyRes = await fetch(url, { method: 'GET', headers: { 'x-api-key': String(apiKey) } });
    const body = await etsyRes.text();
    console.log('[etsy-listings] Etsy status:', etsyRes.status, body.slice(0, 300));
    res.setHeader('Content-Type', 'application/json');
    return res.status(etsyRes.status).send(body);
  } catch (err) {
    console.error('[etsy-listings] fetch failed:', err);
    return res.status(502).json({ error: 'Failed to reach Etsy', detail: String(err) });
  }
}
