import type { ArtworkVariation, EtsyExtras } from '../types';

export interface EtsyImage {
  listing_image_id?: number;
  url_fullxfull: string;
  url_570xN: string;
}

interface EtsyMoney { amount: number; divisor: number; currency_code: string }

interface EtsyVideo {
  video_url: string;
  thumbnail_url?: string;
  video_state?: string;
}

interface EtsyProduct {
  product_id: number;
  sku?: string;
  is_deleted?: boolean;
  offerings?: { offering_id: number; quantity: number; is_enabled: boolean; is_deleted?: boolean; price: EtsyMoney }[];
  property_values?: {
    property_id?: number;
    property_name?: string | null;
    scale_name?: string | null;
    value_ids?: number[];
    values?: string[];
  }[];
}

interface EtsyInventory { products?: EtsyProduct[] }

export interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  price: EtsyMoney;
  materials: string[];
  tags?: string[];
  quantity: number;
  url: string;
  images: EtsyImage[];
  videos?: EtsyVideo[];
  inventory?: EtsyInventory;
  variationImages?: { property_id: number; value_id: number | null; image_id: number }[];
  shipping_profile?: Record<string, any> | null;
  item_length?: number | null;
  item_width?: number | null;
  item_height?: number | null;
  item_dimensions_unit?: string | null;
  item_weight?: number | null;
  item_weight_unit?: string | null;
  [key: string]: unknown;
}

function decodeHtml(s: string): string {
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}

async function fetchListingResource<T>(apiKey: string, shopId: string, listingId: number, resource: 'images' | 'videos' | 'inventory' | 'variation-images'): Promise<T | null> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(
        `/api/etsy-listings?shopId=${encodeURIComponent(shopId)}&listingId=${listingId}&resource=${resource}`,
        { method: 'GET', headers: { 'x-etsy-key': apiKey } }
      );
      if (res.ok) return (await res.json()) as T;
      console.warn(`[Etsy] ${resource} fetch failed for`, listingId, 'status', res.status, 'attempt', attempt);
      if (res.status !== 429 && res.status < 500) return null;
    } catch (err) {
      console.warn(`[Etsy] ${resource} fetch error for`, listingId, 'attempt', attempt, err);
    }
    await new Promise(r => setTimeout(r, 600 * attempt));
  }
  return null;
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
  console.log('[Etsy] Sample listing fields:', JSON.stringify((data.results ?? [])[0] ?? {}).slice(0, 3000));
  const listings = ((data.results ?? []) as EtsyListing[]).map(l => ({
    ...l,
    title: decodeHtml(l.title ?? ''),
    description: decodeHtml(l.description ?? ''),
    tags: (l.tags ?? []).map(decodeHtml),
  }));
  for (const l of listings) {
    if (!l.images || l.images.length === 0) {
      const r = await fetchListingResource<{ results: EtsyImage[] }>(apiKey, shopId, l.listing_id, 'images');
      l.images = r?.results ?? [];
    }
    if (l.videos === undefined) {
      const r = await fetchListingResource<{ results: EtsyVideo[] }>(apiKey, shopId, l.listing_id, 'videos');
      l.videos = r?.results ?? [];
    }
    if (l.inventory === undefined) {
      const r = await fetchListingResource<EtsyInventory>(apiKey, shopId, l.listing_id, 'inventory');
      l.inventory = r ?? { products: [] };
    }
    const hasOptions = (l.inventory.products ?? []).some(p => (p.property_values?.length ?? 0) > 0);
    if (hasOptions) {
      const r = await fetchListingResource<{ results: { property_id: number; value_id: number | null; image_id: number }[] }>(apiKey, shopId, l.listing_id, 'variation-images');
      l.variationImages = r?.results ?? [];
    }
    console.log('[Etsy] Listing', l.listing_id, l.title, '— images:', l.images.length, 'videos:', l.videos.length, 'products:', l.inventory.products?.length ?? 0);
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

const money = (m?: EtsyMoney | null) => (m && m.divisor ? m.amount / m.divisor : undefined);

function buildVariations(listing: EtsyListing): ArtworkVariation[] {
  const products = (listing.inventory?.products ?? []).filter(p => !p.is_deleted);
  const variations: ArtworkVariation[] = [];
  products.forEach((p, index) => {
    const options = (p.property_values ?? [])
      .map((pv, i) => {
        const values = (pv.values && pv.values.length > 0 ? pv.values : (pv.value_ids ?? []).map(String));
        return {
          name: decodeHtml(pv.property_name || pv.scale_name || `Option ${i + 1}`),
          value: decodeHtml(values.join(', ')),
        };
      })
      .filter(o => o.value);
    // Several products with no property values: still offer them, labelled by SKU
    if (options.length === 0) {
      if (products.length < 2) return;
      options.push({ name: 'Option', value: p.sku || `Option ${index + 1}` });
    }
    let image: string | undefined;
    for (const pv of p.property_values ?? []) {
      const match = (listing.variationImages ?? []).find(vi =>
        vi.property_id === pv.property_id && (vi.value_id == null || (pv.value_ids ?? []).includes(vi.value_id))
      );
      const img = match && (listing.images ?? []).find(i => i.listing_image_id === match.image_id);
      if (img) { image = img.url_fullxfull || img.url_570xN; break; }
    }
    const live = (p.offerings ?? []).filter(o => !o.is_deleted);
    const offering = live.find(o => o.is_enabled) ?? live[0];
    if (!offering) return;
    variations.push({
      id: String(p.product_id),
      sku: p.sku || undefined,
      options,
      price: money(offering.price) ?? money(listing.price) ?? 0,
      quantity: offering.is_enabled ? (offering.quantity ?? 0) : 0,
      image,
    });
  });
  if (products.length > 1 && variations.length === 0) {
    console.warn('[Etsy] Could not parse variations for', listing.listing_id, JSON.stringify(listing.inventory).slice(0, 1500));
  }
  return variations;
}

function buildExtras(l: EtsyListing): EtsyExtras {
  const any = l as Record<string, any>;
  const sp = l.shipping_profile as Record<string, any> | null | undefined;
  return {
    who_made: any.who_made,
    when_made: any.when_made,
    is_supply: any.is_supply,
    is_customizable: any.is_customizable,
    is_personalizable: any.is_personalizable,
    personalization_instructions: any.personalization_instructions ?? null,
    processing_min: any.processing_min ?? null,
    processing_max: any.processing_max ?? null,
    processing_unit: any.processing_unit ?? null,
    views: any.views,
    num_favorers: any.num_favorers,
    item_weight: l.item_weight ?? null,
    item_weight_unit: l.item_weight_unit ?? null,
    videos: (l.videos ?? [])
      .filter(v => v.video_url && (!v.video_state || v.video_state === 'active'))
      .map(v => ({ video_url: v.video_url, thumbnail_url: v.thumbnail_url })),
    shipping: sp ? {
      profile_title: sp.title,
      origin_country_iso: sp.origin_country_iso,
      min_processing_days: sp.min_processing_days,
      max_processing_days: sp.max_processing_days,
      destinations: (sp.shipping_profile_destinations ?? []).map((d: Record<string, any>) => ({
        destination: d.destination_country_iso || d.destination_region || 'everywhere_else',
        primary_cost: money(d.primary_cost),
        secondary_cost: money(d.secondary_cost),
        currency: d.primary_cost?.currency_code,
      })),
    } : null,
  };
}

export function etsyVariationSummary(listing: EtsyListing): string {
  const v = buildVariations(listing);
  if (v.length === 0) return '';
  const names = Array.from(new Set(v.flatMap(x => x.options.map(o => o.name))));
  return `${v.length} variation${v.length > 1 ? 's' : ''} (${names.join(', ')})`;
}

export function etsyListingToPayload(listing: EtsyListing) {
  const variations = buildVariations(listing);
  const basePrice = money(listing.price) ?? 0;
  const inStock = variations.filter(v => v.quantity > 0);
  const pool = inStock.length > 0 ? inStock : variations;
  const price = pool.length > 0 ? Math.min(...pool.map(v => v.price)) : basePrice;
  const totalQty = variations.length > 0
    ? variations.reduce((sum, v) => sum + v.quantity, 0)
    : listing.quantity;
  const extras = buildExtras(listing);
  const images = (listing.images ?? []).map(img => img.url_fullxfull || img.url_570xN).filter(Boolean);
  return {
    title: listing.title.trim(),
    description: listing.description.slice(0, 5000),
    price,
    dimensions: pickDimensions(listing),
    materials: pickMaterials(listing),
    images,
    video_url: extras.videos?.[0]?.video_url ?? null,
    availability: totalQty > 0 ? 'available' as const : 'sold' as const,
    quantity: totalQty,
    tags: listing.tags ?? [],
    variations,
    etsy_url: listing.url,
    etsy_listing_id: listing.listing_id,
    etsy_data: extras,
  };
}

// Fields only set when a listing is first imported — a re-import never overwrites these manual edits.
export function etsyNewListingDefaults(category: string) {
  return {
    story: null as null,
    category,
    framing: null as null,
    year: new Date().getFullYear(),
  };
}
