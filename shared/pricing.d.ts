export interface Promo {
  id?: string;
  name?: string;
  code?: string;
  discount_type: 'percent' | 'amount';
  discount_value: number;
  applies_to: 'all' | 'sections' | 'items';
  sections?: string[];
  artwork_ids?: string[];
  starts_at?: string | null;
  ends_at?: string | null;
  active?: boolean;
  min_subtotal?: number;
  exclude_sale_items?: boolean;
  max_redemptions?: number | null;
  redemptions?: number;
}

export interface PricedLine {
  artworkId: string;
  category: string;
  unitCents: number;
  quantity: number;
  onSale: boolean;
}

export function toCents(n: number | string): number;
export function isLive(promo: Promo | null | undefined, now?: number): boolean;
export function appliesTo(promo: Promo, artwork: { id: string; category?: string }): boolean;
export function saleUnitCents(
  artwork: { id: string; category?: string },
  baseCents: number,
  sales: Promo[],
  now?: number
): { cents: number; onSale: boolean; saleName: string | null };
export function applyCoupon(
  coupon: Promo | null | undefined,
  lines: PricedLine[],
  now?: number
): { error: string } | { error?: undefined; eligibleSubtotal: number; discountCents: number; lines: { finalUnitCents: number }[] };
