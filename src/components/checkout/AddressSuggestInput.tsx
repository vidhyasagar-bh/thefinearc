import { useEffect, useRef, useState } from 'react';
import { Input } from '../ui/Input';

export interface SuggestedAddress {
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Suggestion extends SuggestedAddress {
  label: string;
}

interface Props {
  value: string;
  countries: string[];
  onChange: (value: string) => void;
  onPick: (address: SuggestedAddress) => void;
}

const API_KEY = import.meta.env.VITE_GEOAPIFY_KEY as string | undefined;

// Street-address field that suggests full addresses as the customer types (Geoapify). Works as a plain input without a key.
export function AddressSuggestInput({ value, countries, onChange, onPick }: Props) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skipNext = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!API_KEY) return;
    if (skipNext.current) { skipNext.current = false; return; }
    if (value.trim().length < 4) { setItems([]); setOpen(false); return; }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const filter = `countrycode:${countries.map(c => c.toLowerCase()).join(',')}`;
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(value)}&filter=${filter}&limit=5&lang=en&format=json&apiKey=${API_KEY}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const found: Suggestion[] = (data.results ?? [])
          .filter((r: any) => r.street)
          .map((r: any) => ({
            label: r.formatted,
            street1: [r.housenumber, r.street].filter(Boolean).join(' '),
            city: r.city || r.town || r.village || r.county || '',
            state: String(r.state_code || '').toUpperCase(),
            zip: r.postcode || '',
            country: String(r.country_code || '').toUpperCase(),
          }));
        setItems(found);
        setActive(-1);
        setOpen(found.length > 0);
      } catch {
        /* aborted or offline: the field still works as a normal input */
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, countries]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function pick(s: Suggestion) {
    skipNext.current = true;
    setOpen(false);
    setItems([]);
    onPick({ street1: s.street1, city: s.city, state: s.state, zip: s.zip, country: s.country });
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
