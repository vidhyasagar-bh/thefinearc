import type { ArtworkVariation, EtsyExtras } from '../types';

export interface EtsyImage {
  listing_image_id?: number;
  url_fullxfull: string;
  url_570xN: string;
}

export interface EtsyVariationImage {
  property_id?: number;
  value_id?: number | null;
  value?: string;
  image_id: number | string;
}

export interface EtsyDebug {
  inventory?: { source: 'included' | 'fetched'; status?: number; error?: string; products?: number };
  variationImages?: { status?: number; error?: string; count?: number };
  raw?: { inventory?: string; variationImages?: string };
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
  variationImages?: EtsyVariationImage[];
  debug?: EtsyDebug;
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

interface ResourceResult<T> { ok: boolean; status: number; data: T | null; text: string }

async function fetchListingResource<T>(apiKey: string, shopId: string, listingId: number, resource: 'images' | 'videos' | 'inventory' | 'variation-images'): Promise<ResourceResult<T>> {
  let last: ResourceResult<T> = { ok: false, status: 0, data: null, text: '' };
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(
        `/api/etsy-listings?shopId=${encodeURIComponent(shopId)}&listingId=${listingId}&resource=${resource}`,
        { method: 'GET', headers: { 'x-etsy-key': apiKey } }
      );
      const text = await res.text();
      let data: T | null = null;
      try { data = JSON.parse(text) as T; } catch { /* non-JSON error body */ }
      last = { ok: res.ok, status: res.status, data: res.ok ? data : null, text };
      if (res.ok) return last;
      console.warn(`[Etsy] ${resource} fetch failed for`, listingId, 'status', res.status, text.slice(0, 300), 'attempt', attempt);
      if (res.status !== 429 && res.status < 500) return last;
    } catch (err) {
      last = { ok: false, status: 0, data: null, text: String(err) };
      console.warn(`[Etsy] ${resource} fetch error for`, listingId, 'attempt', attempt, err);
    }
    await new Promise(r => setTimeout(r, 600 * attempt));
  }
  return last;
}

function errorText(r: { text: string }): string {
  try {
    const j = JSON.parse(r.text);
    return String(j.error_description || j.error || j.message || r.text).slice(0, 200);
  } catch {
    return r.text.slice(0, 200);
  }
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
  const listings = ((data.results ?? []) as EtsyListing[]).map(l => ({
    ...l,
    title: decodeHtml(l.title ?? ''),
    description: decodeHtml(l.description ?? ''),
    tags: (l.tags ?? []).map(decodeHtml),
    debug: {} as EtsyDebug,
  }));
  for (const l of listings) {
    const debug = l.debug as EtsyDebug;
    if (!l.images || l.images.length === 0) {
      const r = await fetchListingResource<{ results: EtsyImage[] }>(apiKey, shopId, l.listing_id, 'images');
      l.images = r.data?.results ?? [];
    }
    if (l.videos === undefined) {
      const r = await fetchListingResource<{ results: EtsyVideo[] }>(apiKey, shopId, l.listing_id, 'videos');
      l.videos = r.data?.results ?? [];
    }

    // Inventory (the list of purchasable variations)
    if (l.inventory === undefined) {
      const r = await fetchListingResource<EtsyInventory>(apiKey, shopId, l.listing_id, 'inventory');
      l.inventory = r.data ?? { products: [] };
      debug.inventory = r.ok
        ? { source: 'fetched', status: r.status, products: r.data?.products?.length ?? 0 }
        : { source: 'fetched', status: r.status, error: errorText(r) };
      debug.raw = { inventory: r.text.slice(0, 2500) };
    } else {
      debug.inventory = { source: 'included', products: l.inventory.products?.length ?? 0 };
      debug.raw = { inventory: JSON.stringify(l.inventory).slice(0, 2500) };
    }

    // Which photo belongs to which variation
    const hasOptions = (l.inventory.products ?? []).some(p => (p.property_values?.length ?? 0) > 0);
    if (hasOptions) {
      const r = await fetchListingResource<{ results: EtsyVariationImage[] }>(apiKey, shopId, l.listing_id, 'variation-images');
      l.variationImages = r.data?.results ?? [];
      debug.variationImages = r.ok
        ? { status: r.status, count: l.variationImages.length }
        : { status: r.status, error: errorText(r) };
      debug.raw = { ...debug.raw, variationImages: r.text.slice(0, 2500) };
    }
    console.log('[Etsy] Listing', l.listing_id, l.title, JSON.stringify({ ...debug, raw: undefined }));
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
      const match = (listing.variationImages ?? []).find(vi => {
        if (vi.property_id != null && pv.property_id != null && Number(vi.property_id) !== Number(pv.property_id)) return false;
        const byId = vi.value_id != null && (pv.value_ids ?? []).map(Number).includes(Number(vi.value_id));
        const byText = Boolean(vi.value) && (pv.values ?? []).includes(vi.value as string);
        return byId || byText;
      });
      const img = match && (listing.images ?? []).find(i => String(i.listing_image_id) === String(match.image_id));
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

// One-line, human-readable result of what Etsy returned for a listing's variations
export function etsyDiagnosticLine(listing: EtsyListing): string {
  const d = listing.debug;
  if (d?.inventory?.error) return `Variations: Etsy refused (${d.inventory.status}) ${d.inventory.error}`;
  const v = buildVariations(listing);
  const products = d?.inventory?.products ?? listing.inventory?.products?.length ?? 0;
  if (v.length === 0) return `Variations: none found (${products} product${products === 1 ? '' : 's'} from Etsy)`;
  const tagged = v.filter(x => x.image).length;
  let line = `${v.length} variation${v.length > 1 ? 's' : ''}, ${tagged} with photo`;
  if (d?.variationImages?.error) line += ` — photo tags refused (${d.variationImages.status}) ${d.variationImages.error}`;
  else if (tagged < v.length && d?.variationImages) line += ` (Etsy sent ${d.variationImages.count ?? 0} photo tags)`;
  return line;
}

export function etsyDiagnosticsReport(listings: EtsyListing[]): string {
  return JSON.stringify(listings.map(l => ({
    listing_id: l.listing_id,
    title: l.title,
    summary: etsyDiagnosticLine(l),
    debug: l.debug,
  })), null, 2);
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
