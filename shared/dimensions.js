// Artwork size helpers, shared by the admin, the Etsy import and the shipping estimate.

const trim = n => String(Math.round(Number(n) * 100) / 100);
const num = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

// "12 × 12 in", "80 × 100 cm", "12 × 12 × 1.5 in" (empty when length or width is missing)
export function formatDimensions({ length, width, depth, unit }) {
  if (!num(length) || !num(width)) return '';
  const parts = [length, width, ...(num(depth) ? [depth] : [])].map(trim);
  return `${parts.join(' × ')} ${unit === 'cm' ? 'cm' : 'in'}`;
}

// Reads sizes typed as text: "80 × 100 cm", "12x12 inches", `24"`, "12 x 12 x 1.5 in". Returns null if none found.
export function parseDimensions(text) {
  const s = String(text || '');
  const unitOf = u => (/^cm/i.test(u || '') ? 'cm' : 'in');
  const multi = s.match(/(\d+(?:\.\d+)?)\s*(?:"|”|in(?:ch(?:es)?)?|cm)?\s*(?:x|×|X|by)\s*(\d+(?:\.\d+)?)(?:\s*(?:"|”|in(?:ch(?:es)?)?|cm)?\s*(?:x|×|X|by)\s*(\d+(?:\.\d+)?))?\s*(cm|in(?:ch(?:es)?)?|"|”)?/i);
  if (multi) {
    return { length: Number(multi[1]), width: Number(multi[2]), depth: multi[3] ? Number(multi[3]) : null, unit: unitOf(multi[4]) };
  }
  // A single size such as 24" is a diameter or a square side
  const single = s.match(/(\d+(?:\.\d+)?)\s*(cm|in(?:ch(?:es)?)?|"|”)/i);
  if (single) return { length: Number(single[1]), width: Number(single[1]), depth: null, unit: unitOf(single[2]) };
  return null;
}

// Etsy sizes can be in many units; we keep inches or centimetres
export function convertEtsyUnit(value, unit) {
  const v = Number(value);
  const u = String(unit || '').toLowerCase();
  if (!(v > 0)) return null;
  if (u === 'cm' || u === 'centimeters' || u === 'centimetres') return { value: v, unit: 'cm' };
  if (u === 'mm' || u === 'millimeters') return { value: v / 10, unit: 'cm' };
  if (u === 'm' || u === 'meters') return { value: v * 100, unit: 'cm' };
  if (u === 'ft' || u === 'feet') return { value: v * 12, unit: 'in' };
  if (u === 'yd' || u === 'yards') return { value: v * 36, unit: 'in' };
  return { value: v, unit: 'in' }; // 'in', 'inches' or unknown
}

export const toInches = (value, unit) => (unit === 'cm' ? Number(value) / 2.54 : Number(value));

// The shipping box for one packed piece: the artwork plus padding all round
export function boxInches({ length, width, depth, unit }, padding = 2) {
  const l = num(length), w = num(width);
  if (!l || !w) return null;
  const d = num(depth) ?? (unit === 'cm' ? 2.5 : 1);
  return {
    length: toInches(l, unit) + padding,
    width: toInches(w, unit) + padding,
    height: Math.max(toInches(d, unit), 0.5) + padding,
  };
}
