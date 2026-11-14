// Sale and coupon maths, shared by the browser (to show prices) and the server (to charge them).
// All money below is in whole cents.

export const toCents = n => Math.round(Number(n) * 100);

export function isLive(promo, now = Date.now()) {
  if (!promo || promo.active === false) return false;
  if (promo.starts_at && Date.parse(promo.starts_at) > now) return false;
  if (promo.ends_at && Date.parse(promo.ends_at) <= now) return false;
  return true;
}

// artwork: { id, category }
export function appliesTo(promo, artwork) {
  if (promo.applies_to === 'items') return (promo.artwork_ids || []).includes(artwork.id);
  if (promo.applies_to === 'sections') return (promo.sections || []).includes(String(artwork.category || '').toLowerCase());
  return true;
}

// Never discount an item below $1 (or its own price, if that is lower)
function discounted(baseCents, promo) {
  const value = Number(promo.discount_value);
  const off = promo.discount_type === 'percent'
    ? Math.round((baseCents * Math.min(value, 95)) / 100)
    : toCents(value);
  return Math.max(Math.min(baseCents, 100), baseCents - off);
}

// Best live sale for one item. Returns { cents, onSale, saleName }
export function saleUnitCents(artwork, baseCents, sales, now = Date.now()) {
  let best = { cents: baseCents, onSale: false, saleName: null };
  for (const sale of sales || []) {
    if (!isLive(sale, now) || !appliesTo(sale, artwork)) continue;
    const cents = discounted(baseCents, sale);
    if (cents < best.cents) best = { cents, onSale: true, saleName: sale.name };
  }
  return best;
}

// lines: [{ artworkId, category, unitCents (after any sale), quantity, onSale }]
// Returns { error } or { eligibleSubtotal, discountCents, lines: [{ finalUnitCents }] }
export function applyCoupon(coupon, lines, now = Date.now()) {
  if (!coupon || !isLive(coupon, now)) return { error: 'This code is not valid right now.' };
  if (coupon.max_redemptions != null && coupon.redemptions >= coupon.max_redemptions) {
    return { error: 'This code has already been used the maximum number of times.' };
  }

  const subtotals = lines.map(l => l.unitCents * l.quantity);
  const eligible = lines.map(l =>
    appliesTo(coupon, { id: l.artworkId, category: l.category }) && !(coupon.exclude_sale_items && l.onSale)
  );
  const eligibleSubtotal = subtotals.reduce((sum, s, i) => sum + (eligible[i] ? s : 0), 0);
  const cartSubtotal = subtotals.reduce((a, b) => a + b, 0);

  if (eligibleSubtotal === 0) return { error: 'This code does not apply to the items in your cart.' };
  const minimum = toCents(coupon.min_subtotal || 0);
  if (minimum > eligibleSubtotal) {
    return { error: `Spend at least $${(minimum / 100).toFixed(2)} on eligible items to use this code.` };
  }

  // The order must still come to at least 50 cents (Stripe's minimum charge)
  const maxDiscount = Math.max(0, cartSubtotal - 50);
  const wanted = coupon.discount_type === 'percent'
    ? Math.round((eligibleSubtotal * Math.min(Number(coupon.discount_value), 95)) / 100)
    : toCents(coupon.discount_value);
  const total = Math.min(wanted, eligibleSubtotal, maxDiscount);

  // Share the discount across the eligible lines in proportion to their value (largest remainder keeps it exact)
  const shares = subtotals.map((s, i) => (eligible[i] ? (total * s) / eligibleSubtotal : 0));
  const floors = shares.map(Math.floor);
  let left = total - floors.reduce((a, b) => a + b, 0);
  shares
    .map((s, i) => ({ i, frac: s - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => { if (left > 0 && eligible[i]) { floors[i] += 1; left -= 1; } });

  // Stripe needs a whole-cent price per unit, so each line is rounded to the nearest unit price
  const out = lines.map((l, i) => ({
    finalUnitCents: Math.max(1, Math.round((subtotals[i] - floors[i]) / l.quantity)),
  }));
  const finalTotal = out.reduce((sum, o, i) => sum + o.finalUnitCents * lines[i].quantity, 0);
  return { eligibleSubtotal, discountCents: cartSubtotal - finalTotal, lines: out };
}
