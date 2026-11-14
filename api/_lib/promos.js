import { sb } from './supabase.js';
import { isLive, saleUnitCents, applyCoupon } from '../../shared/pricing.js';

const ID = /^[0-9a-zA-Z-]{1,64}$/;

export function validLines(lines) {
  return Array.isArray(lines) && lines.length > 0 && lines.length <= 20 && lines.every(l =>
    typeof l?.artworkId === 'string' && ID.test(l.artworkId) &&
    (l.variationId == null || (typeof l.variationId === 'string' && ID.test(l.variationId)))
  );
}

export async function loadArtworks(lines) {
  const ids = [...new Set(lines.map(l => l.artworkId))];
  const rows = await sb(`artworks?select=id,title,price,images,availability,quantity,variations,category&id=in.(${ids.join(',')})`);
  return new Map((rows || []).map(a => [a.id, a]));
}

// Turns the cart into checked entries (availability, option, stock, quantity) with the base price in cents
export function buildEntries(lines, byId) {
  const entries = [];
  for (const [i, l] of lines.entries()) {
    const art = byId.get(l.artworkId);
    if (!art || art.availability !== 'available') {
      return { status: 409, error: `"${art?.title ?? 'An item'}" is no longer available.` };
    }
    const variations = Array.isArray(art.variations) ? art.variations : [];
    let price = Number(art.price);
    let stock = art.quantity ?? 1;
    let name = art.title;
    if (variations.length > 0) {
      const v = variations.find(x => x.id === l.variationId);
      if (!v) return { status: 400, error: `Please choose an option for "${art.title}".` };
      price = Number(v.price);
      stock = v.quantity;
      name = `${art.title} (${v.options.map(o => `${o.name}: ${o.value}`).join(', ')})`;
    }
    if (stock < 1) return { status: 409, error: `"${name}" is sold out.` };
    entries.push({
      i, art, name,
      variationId: l.variationId ?? null,
      quantity: Math.max(1, Math.min(Number(l.quantity) || 1, stock, 10)),
      baseCents: Math.round(price * 100),
    });
  }
  return { entries };
}

export async function loadLiveSales() {
  const rows = await sb('sales?select=*&active=eq.true');
  return (rows || []).filter(s => isLive(s));
}

export async function loadCoupon(code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(clean)) return null;
  const rows = await sb(`coupons?select=*&code=eq.${encodeURIComponent(clean)}`);
  return rows?.[0] ?? null;
}

// Sale first, then the coupon on the sale prices. Everything is whole cents per unit, as Stripe needs.
export function priceEntries(entries, sales, coupon) {
  const priced = entries.map(e => {
    const s = saleUnitCents({ id: e.art.id, category: e.art.category }, e.baseCents, sales);
    return { ...e, saleUnitCents: s.cents, onSale: s.onSale, finalUnitCents: s.cents };
  });
  const saleSubtotalCents = priced.reduce((sum, p) => sum + p.saleUnitCents * p.quantity, 0);

  let discountCents = 0;
  let couponError = null;
  if (coupon) {
    const result = applyCoupon(coupon, priced.map(p => ({
      artworkId: p.art.id, category: p.art.category, unitCents: p.saleUnitCents, quantity: p.quantity, onSale: p.onSale,
    })));
    if (result.error) couponError = result.error;
    else {
      result.lines.forEach((l, i) => { priced[i].finalUnitCents = l.finalUnitCents; });
      discountCents = result.discountCents;
    }
  }
  const itemsTotalCents = priced.reduce((sum, p) => sum + p.finalUnitCents * p.quantity, 0);
  return { entries: priced, saleSubtotalCents, discountCents, itemsTotalCents, couponError };
}
