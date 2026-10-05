import type { ArtworkVariation } from '../types';

// "Heart design 2" for a single option type, "Size: 12 · Color: Green" for several
export function variationLabel(v: ArtworkVariation): string {
  return v.options.length === 1
    ? v.options[0].value
    : v.options.map(o => `${o.name}: ${o.value}`).join(' · ');
}
