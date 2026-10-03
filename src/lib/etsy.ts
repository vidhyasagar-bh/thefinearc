const ETSY_SHOP_NAME = 'thefinearcbyleela';

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
}

async function getShopId(apiKey: string): Promise<number> {
  const res = await fetch(
    `https://openapi.etsy.com/v3/application/shops?shop_name=${ETSY_SHOP_NAME}`,
    { headers: { 'x-api-key': apiKey } }
  );
  console.log('[Etsy] Shop lookup status:', res.status);
  const body = await res.text();
  console.log('[Etsy] Shop lookup body:', body.slice(0, 300));
  if (!res.ok) throw new Error(`Etsy shop lookup ${res.status}: ${body}`);
  const data = JSON.parse(body);
  const shop = data.results?.[0];
  if (!shop) throw new Error(`Shop "${ETSY_SHOP_NAME}" not found`);
  console.log('[Etsy] Shop ID:', shop.shop_id);
  return shop.shop_id as number;
}

export async function fetchEtsyListings(apiKey: string): Promise<EtsyListing[]> {
  const shopId = await getShopId(apiKey);
  const url = `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=100&includes=Images`;
  console.log('[Etsy] Fetching listings:', url);
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } });
  console.log('[Etsy] Listings status:', res.status, res.statusText);
  const body = await res.text();
  console.log('[Etsy] Listings body:', body.slice(0, 500));
  if (!res.ok) throw new Error(`Etsy ${res.status}: ${body}`);
  const data = JSON.parse(body);
  console.log('[Etsy] Listing count:', data.results?.length ?? 0);
  return (data.results ?? []) as EtsyListing[];
}

export function etsyListingToPayload(listing: EtsyListing) {
  const price = listing.price.amount / listing.price.divisor;
  const images = (listing.images ?? []).map(img => img.url_fullxfull).filter(Boolean);
  return {
    title: listing.title.trim(),
    description: listing.description.slice(0, 3000),
    story: null as null,
    price,
    dimensions: '',
    materials: (listing.materials ?? []).join(', '),
    category: 'painting' as const,
    images,
    video_url: null as null,
    availability: listing.quantity > 0 ? 'available' as const : 'sold' as const,
    framing: null as null,
    year: new Date().getFullYear(),
  };
}
