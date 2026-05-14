const ETSY_SHOP = 'thefinearcbyleela';

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

export async function fetchEtsyListings(apiKey: string): Promise<EtsyListing[]> {
  const url = `https://openapi.etsy.com/v3/application/shops/${ETSY_SHOP}/listings/active?limit=100&includes=Images`;
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Etsy ${res.status}: ${body}`);
  }
  const data = await res.json();
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
