export interface EtsyImage {
  url_fullxfull: string;
  url_570xN: string;
}

export interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  price: { amount: number; divisor: number; currency_code: string };
  materials: string[];
  quantity: number;
  url: string;
  images: EtsyImage[];
  item_length?: number | null;
  item_width?: number | null;
  item_height?: number | null;
  item_dimensions_unit?: string | null;
}

function decodeHtml(s: string): string {
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}

async function fetchListingImages(apiKey: string, shopId: string, listingId: number): Promise<EtsyImage[]> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`/api/etsy-listings?shopId=${encodeURIComponent(shopId)}&listingId=${listingId}`, {
        method: 'GET', headers: { 'x-etsy-key': apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        return (data.results ?? []) as EtsyImage[];
      }
      console.warn('[Etsy] Images fetch failed for', listingId, 'status', res.status, 'attempt', attempt);
      if (res.status !== 429 && res.status < 500) return [];
    } catch (err) {
      console.warn('[Etsy] Images fetch error for', listingId, 'attempt', attempt, err);
    }
    await new Promise(r => setTimeout(r, 600 * attempt));
  }
  return [];
}

export async function fetchEtsyListings(apiKey: string, shopId: string): Promise<EtsyListing[]> {
  const url = `/api/etsy-listings?shopId=${encodeURIComponent(shopId)}`;
  console.log('[Etsy] Fetching listings via proxy:', url);
  const res = await fetch(url, { method: 'GET', headers: { 'x-etsy-key': apiKey } });
  console.log('[Etsy] Status:', res.status, res.statusText);
  const body = await res.text();
  console.log('[Etsy] Body:', body.slice(0, 500));
  if (!res.ok) throw new Error(`Etsy ${res.status}: ${body}`);
  const data = JSON.parse(body);
  console.log('[Etsy] Listing count:', data.results?.length ?? 0);
  console.log('[Etsy] Sample listing fields:', JSON.stringify((data.results ?? [])[0] ?? {}).slice(0, 1500));
  const listings = ((data.results ?? []) as EtsyListing[]).map(l => ({
    ...l,
    title: decodeHtml(l.title ?? ''),
    description: decodeHtml(l.description ?? ''),
  }));
  for (const l of listings) {
    if (!l.images || l.images.length === 0) {
      l.images = await fetchListingImages(apiKey, shopId, l.listing_id);
      console.log('[Etsy] Fetched images separately for', l.listing_id, l.title, l.images.length);
    }
  }
  return listings;
}

function pickDimensions(l: EtsyListing): string {
  const unit = l.item_dimensions_unit ?? '';
  const parts = [l.item_length, l.item_width, l.item_height].filter(n => typeof n === 'number' && n > 0);
  if (parts.length >= 2) return `${parts.join(' × ')}${unit ? ' ' + unit : ''}`;

  const text = `${l.title}\n${l.description}`;
  const labelled = text.match(/(?:size|dimensions?)\s*[:\-–]\s*([^\n]{2,80})/i);
  if (labelled) return labelled[1].trim();
  const xBy = text.match(/\d+(?:\.\d+)?\s*(?:"|”|in(?:ch(?:es)?)?|cm)?\s*[x×]\s*\d+(?:\.\d+)?\s*(?:"|”|in(?:ch(?:es)?)?|cm)?/i);
  if (xBy) return xBy[0].trim();
  const single = l.title.match(/\d+(?:\.\d+)?\s*(?:"|”|inch(?:es)?|cm)/i);
  return single ? single[0].trim() : '';
}

function pickMaterials(l: EtsyListing): string {
  if (l.materials && l.materials.length > 0) return l.materials.join(', ');
  const m = l.description.match(/materials?(?:\s+used)?\s*[:\-–]\s*([^\n]{2,120})/i);
  return m ? m[1].trim() : '';
}

export function etsyListingToPayload(listing: EtsyListing) {
  const price = listing.price.amount / listing.price.divisor;
  const images = (listing.images ?? []).map(img => img.url_fullxfull || img.url_570xN).filter(Boolean);
  return {
    title: listing.title.trim(),
    description: listing.description.slice(0, 3000),
    story: null as null,
    price,
    dimensions: pickDimensions(listing),
    materials: pickMaterials(listing),
    category: 'painting' as const,
    images,
    video_url: null as null,
    availability: listing.quantity > 0 ? 'available' as const : 'sold' as const,
    framing: null as null,
    year: new Date().getFullYear(),
  };
}
