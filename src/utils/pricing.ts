import { saleUnitCents } from '../../shared/pricing.js';
import type { Promo } from '../../shared/pricing.js';
import type { Artwork } from '../types';

export type { Promo };

export interface PriceInfo {
  price: number;      // what the customer pays per item (dollars)
  original: number;   // the listed price
  onSale: boolean;
  percentOff: number; // whole percent, 0 when not on sale
  saleName: string | null;
}

export function priceFor(artwork: Pick<Artwork, 'id' | 'category'>, base: number, sales: Promo[]): PriceInfo {
  const baseCents = Math.round(base * 100);
  const r = saleUnitCents(artwork, baseCents, sales);
  return {
    price: r.cents / 100,
    original: base,
    onSale: r.onSale,
    percentOff: r.onSale && baseCents > 0 ? Math.round((1 - r.cents / baseCents) * 100) : 0,
    saleName: r.saleName,
  };
}

// The "from" price shown on listings: the cheapest option, after any sale
export function listingPrice(artwork: Artwork, sales: Promo[]): PriceInfo & { from: boolean } {
  const variations = artwork.variations ?? [];
  const bases = variations.length > 0 ? variations.map(v => v.price) : [artwork.price];
  const infos = bases.map(b => priceFor(artwork, b, sales));
  const best = infos.reduce((a, b) => (b.price < a.price ? b : a));
  return { ...best, from: new Set(infos.map(i => i.price)).size > 1 };
}
