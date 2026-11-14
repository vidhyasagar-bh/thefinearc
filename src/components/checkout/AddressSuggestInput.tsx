import { useEffect, useRef, useState } from 'react';
import { Input } from '../ui/Input';

export interface SuggestedAddress {
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Suggestion {
  label: string;
  // Geoapify returns the full address up front; Google returns an id that is looked up when picked
  address?: SuggestedAddress;
  placeId?: string;
}

interface Props {
  value: string;
  countries: string[];
  onChange: (value: string) => void;
  onPick: (address: SuggestedAddress) => void;
}

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY as string | undefined;
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY as string | undefined;
const HAS_PROVIDER = Boolean(GOOGLE_KEY || GEOAPIFY_KEY);
export const addressSuggestionsAvailable = HAS_PROVIDER;

const newSession = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

async function googleSuggest(text: string, countries: string[], session: string, signal: AbortSignal): Promise<Suggestion[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY! },
    body: JSON.stringify({ input: text, sessionToken: session, includedRegionCodes: countries.map(c => c.toLowerCase()).slice(0, 15) }),
  });
  if (!res.ok) {
    console.warn('[address suggestions] Google refused the request:', res.status, (await res.text()).slice(0, 300));
    return [];
  }
  const data = await res.json();
  return (data.suggestions ?? [])
    .map((s: any) => s.placePrediction)
    .filter((p: any) => p?.placeId && (!p.types || p.types.some((t: string) => ['street_address', 'premise', 'subpremise'].includes(t))))
    .slice(0, 5)
    .map((p: any) => ({ label: p.text?.text ?? '', placeId: p.placeId }));
}

async function googleResolve(placeId: string, session: string): Promise<SuggestedAddress | null> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(session)}`, {
    headers: { 'X-Goog-Api-Key': GOOGLE_KEY!, 'X-Goog-FieldMask': 'addressComponents' },
  });
  if (!res.ok) {
    console.warn('[address suggestions] Google place lookup failed:', res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const parts: { longText: string; shortText: string; types: string[] }[] = (await res.json()).addressComponents ?? [];
  const find = (type: string) => parts.find(p => p.types.includes(type));
  const number = find('street_number')?.longText;
  const route = find('route')?.shortText ?? find('route')?.longText;
  return {
    street1: [number, route].filter(Boolean).join(' '),
    city: (find('locality') ?? find('postal_town') ?? find('sublocality') ?? find('administrative_area_level_2'))?.longText ?? '',
    state: (find('administrative_area_level_1')?.shortText ?? '').toUpperCase(),
    zip: find('postal_code')?.longText ?? '',
    country: (find('country')?.shortText ?? '').toUpperCase(),
  };
}

async function geoapifySuggest(text: string, countries: string[], signal: AbortSignal): Promise<Suggestion[]> {
  const filter = `countrycode:${countries.map(c => c.toLowerCase()).join(',')}`;
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&filter=${filter}&limit=5&lang=en&format=json&apiKey=${GEOAPIFY_KEY}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    console.warn('[address suggestions] Geoapify refused the request:', res.status, (await res.text()).slice(0, 200));
    return [];
  }
  const data = await res.json();
  return (data.results ?? [])
    .filter((r: any) => r.street)
    .map((r: any) => ({
      label: r.formatted,
      address: {
        street1: [r.housenumber, r.street].filter(Boolean).join(' '),
        city: r.city || r.town || r.village || r.county || '',
        state: String(r.state_code || '').toUpperCase(),
        zip: r.postcode || '',
        country: String(r.country_code || '').toUpperCase(),
      },
    }));
}

// Street-address field that suggests full addresses as the customer types.
// Uses Google Places if VITE_GOOGLE_PLACES_KEY is set, otherwise Geoapify, otherwise it is a plain input.
export function AddressSuggestInput({ value, countries, onChange, onPick }: Props) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skipNext = useRef(false);
  const session = useRef(newSession());
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!HAS_PROVIDER) console.info('[address suggestions] off: set VITE_GOOGLE_PLACES_KEY (or VITE_GEOAPIFY_KEY) in Vercel, then redeploy.');
  }, []);

  useEffect(() => {
    if (!HAS_PROVIDER) return;
    if (skipNext.current) { skipNext.current = false; return; }
    if (value.trim().length < 3) { setItems([]); setOpen(false); return; }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const found = GOOGLE_KEY
          ? await googleSuggest(value, countries, session.current, controller.signal)
          : await geoapifySuggest(value, countries, controller.signal);
        if (found.length === 0) console.info('[address suggestions] no matches for', value);
        setItems(found);
        setActive(-1);
        setOpen(found.length > 0);
      } catch {
        /* aborted or offline: the field still works as a normal input */
      }
    }, GOOGLE_KEY ? 150 : 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, countries]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function pick(s: Suggestion) {
    skipNext.current = true;
    setOpen(false);
    setItems([]);
    const address = s.address ?? (s.placeId ? await googleResolve(s.placeId, session.current) : null);
    session.current = newSession(); // a lookup ends Google's billing session
    if (address) onPick(address);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <Input
        label="Street address *"
        value={value}
        required
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => items.length > 0 && setOpen(true)}
      />
      {open && (
        <ul role="listbox" className="absolute z-20 left-0 right-0 mt-1 bg-art-white border border-art-pale shadow-lg max-h-64 overflow-auto">
          {items.map((s, i) => (
            <li
              key={`${s.label}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActive(i)}
              className={`px-4 py-3 font-sans text-sm cursor-pointer ${i === active ? 'bg-cream-100 text-art-charcoal' : 'text-art-muted'}`}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
