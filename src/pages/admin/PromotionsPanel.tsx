import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Edit2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { adminApi } from '../../lib/adminApi';
import { sectionLabel } from '../../utils/sections';
import { formatPrice, formatDate } from '../../utils/format';
import type { Artwork } from '../../types';

type Scope = 'all' | 'sections' | 'items';

interface Promo {
  id: string;
  name?: string;
  code?: string;
  discount_type: 'percent' | 'amount';
  discount_value: number;
  applies_to: Scope;
  sections: string[];
  artwork_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  min_subtotal?: number;
  exclude_sale_items?: boolean;
  max_redemptions?: number | null;
  redemptions?: number;
}

interface FormState {
  id?: string;
  name: string;
  code: string;
  discount_type: 'percent' | 'amount';
  discount_value: string;
  applies_to: Scope;
  sections: string[];
  artwork_ids: string[];
  starts_at: string;
  ends_at: string;
  active: boolean;
  min_subtotal: string;
  exclude_sale_items: boolean;
  max_redemptions: string;
}

const blank: FormState = {
  name: '', code: '', discount_type: 'percent', discount_value: '', applies_to: 'all', sections: [], artwork_ids: [],
  starts_at: '', ends_at: '', active: true, min_subtotal: '', exclude_sale_items: false, max_redemptions: '',
};

const pad = (n: number) => String(n).padStart(2, '0');
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function status(p: Promo): { label: string; className: string } {
  const now = Date.now();
  if (!p.active) return { label: 'Paused', className: 'bg-gray-100 text-gray-600' };
  if (p.starts_at && Date.parse(p.starts_at) > now) return { label: 'Scheduled', className: 'bg-blue-50 text-blue-700' };
  if (p.ends_at && Date.parse(p.ends_at) <= now) return { label: 'Ended', className: 'bg-gray-100 text-gray-600' };
  if (p.max_redemptions != null && (p.redemptions ?? 0) >= p.max_redemptions) return { label: 'Used up', className: 'bg-yellow-50 text-yellow-700' };
  return { label: 'Live', className: 'bg-green-50 text-green-700' };
}

function describe(p: Promo, artworks: Artwork[]): string {
  const amount = p.discount_type === 'percent' ? `${p.discount_value}% off` : `${formatPrice(p.discount_value, 'USD', 2)} off`;
  const scope = p.applies_to === 'all' ? 'everything'
    : p.applies_to === 'sections' ? p.sections.map(sectionLabel).join(', ')
    : `${p.artwork_ids.length} ${p.artwork_ids.length === 1 ? 'listing' : 'listings'}${artworks.length ? '' : ''}`;
  return `${amount} · ${scope}`;
}

function toForm(p: Promo): FormState {
  return {
    id: p.id, name: p.name ?? '', code: p.code ?? '', discount_type: p.discount_type, discount_value: String(p.discount_value),
    applies_to: p.applies_to, sections: p.sections ?? [], artwork_ids: p.artwork_ids ?? [],
    starts_at: toLocalInput(p.starts_at), ends_at: toLocalInput(p.ends_at), active: p.active,
    min_subtotal: p.min_subtotal ? String(p.min_subtotal) : '', exclude_sale_items: Boolean(p.exclude_sale_items),
    max_redemptions: p.max_redemptions != null ? String(p.max_redemptions) : '',
  };
}

const selectClass = 'w-full bg-transparent border-b border-art-light text-art-charcoal font-sans text-sm py-3 focus:outline-none focus:border-art-charcoal';
const label = 'block text-[10px] tracking-widest uppercase text-art-muted mb-2 font-sans';

function ScopePicker({ form, set, artworks }: { form: FormState; set: (patch: Partial<FormState>) => void; artworks: Artwork[] }) {
  const [search, setSearch] = useState('');
  const sections = useMemo(() => Array.from(new Set(artworks.map(a => a.category).filter(Boolean))).sort(), [artworks]);
  const shown = artworks.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  return (
    <div className="space-y-3">
      <div>
        <label className={label}>Applies to</label>
        <select value={form.applies_to} onChange={e => set({ applies_to: e.target.value as Scope })} className={selectClass}>
          <option value="all">All items</option>
          <option value="sections">Chosen sections</option>
          <option value="items">Chosen listings</option>
        </select>
      </div>

      {form.applies_to === 'sections' && (
        <div className="flex flex-wrap gap-2">
          {sections.length === 0 && <p className="font-sans text-xs text-art-muted">No sections yet. Add sections to your listings first.</p>}
          {sections.map(sec => (
            <button key={sec} type="button" onClick={() => set({ sections: toggle(form.sections, sec) })}
              className={`font-sans text-xs px-3 py-1.5 border transition-colors ${form.sections.includes(sec) ? 'bg-art-charcoal text-art-white border-art-charcoal' : 'border-art-light text-art-charcoal hover:border-art-charcoal'}`}>
              {sectionLabel(sec)}
            </button>
          ))}
        </div>
      )}

      {form.applies_to === 'items' && (
        <div className="space-y-2">
          <Input label={`Listings (${form.artwork_ids.length} chosen)`} placeholder="Search listings…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="max-h-56 overflow-auto border border-art-pale divide-y divide-art-pale bg-white">
            {shown.map(a => (
              <label key={a.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-cream-50">
                <input type="checkbox" checked={form.artwork_ids.includes(a.id)} onChange={() => set({ artwork_ids: toggle(form.artwork_ids, a.id) })} />
                {a.images?.[0] && <img src={a.images[0]} alt="" className="w-8 h-8 object-cover" />}
                <span className="font-sans text-sm text-art-charcoal truncate flex-1">{a.title}</span>
                <span className="font-sans text-xs text-art-muted">{formatPrice(a.price)}</span>
              </label>
            ))}
            {shown.length === 0 && <p className="p-3 font-sans text-xs text-art-muted">No listings found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function PromoForm({ kind, form, set, artworks, saving, onSave, onCancel }: {
  kind: 'sale' | 'coupon';
  form: FormState;
  set: (patch: Partial<FormState>) => void;
  artworks: Artwork[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="border border-art-pale bg-cream-50 p-4 md:p-6 space-y-5 mb-8">
      <h3 className="font-serif text-xl font-light text-art-charcoal">
        {form.id ? 'Edit' : 'New'} {kind === 'sale' ? 'sale' : 'coupon code'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {kind === 'sale' ? (
          <Input label="Sale name *" placeholder="Summer sale" value={form.name} onChange={e => set({ name: e.target.value })} />
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Code *" placeholder="SPRING20" value={form.code}
                onChange={e => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} />
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => set({ code: randomCode() })}>Generate</Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Discount</label>
            <select value={form.discount_type} onChange={e => set({ discount_type: e.target.value as 'percent' | 'amount' })} className={selectClass}>
              <option value="percent">Percent off</option>
              <option value="amount">{kind === 'sale' ? 'Amount off each item' : 'Flat amount off'}</option>
            </select>
          </div>
          <Input label={form.discount_type === 'percent' ? 'Percent (1–95) *' : 'Amount ($) *'} type="number" min="0" step="0.01"
            value={form.discount_value} onChange={e => set({ discount_value: e.target.value })} />
        </div>
      </div>

      <ScopePicker form={form} set={set} artworks={artworks} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input label="Starts (optional)" type="datetime-local" value={form.starts_at} onChange={e => set({ starts_at: e.target.value })} />
        <Input label="Ends (optional)" type="datetime-local" value={form.ends_at} onChange={e => set({ ends_at: e.target.value })} />
      </div>

      {kind === 'coupon' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input label="Minimum order ($, optional)" type="number" min="0" step="0.01" value={form.min_subtotal} onChange={e => set({ min_subtotal: e.target.value })} />
          <Input label="Usage limit (optional)" type="number" min="1" step="1" placeholder="Unlimited" value={form.max_redemptions} onChange={e => set({ max_redemptions: e.target.value })} />
          <label className="flex items-center gap-2 font-sans text-sm text-art-charcoal sm:col-span-2">
            <input type="checkbox" checked={form.exclude_sale_items} onChange={e => set({ exclude_sale_items: e.target.checked })} />
            Don't apply to items that are already on sale
          </label>
        </div>
      )}

      <label className="flex items-center gap-2 font-sans text-sm text-art-charcoal">
        <input type="checkbox" checked={form.active} onChange={e => set({ active: e.target.checked })} />
        {kind === 'sale' ? 'Sale is switched on' : 'Code is switched on'}
      </label>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">{saving ? 'Saving…' : 'Save'}</Button>
        <Button variant="secondary" onClick={onCancel} className="w-full sm:w-auto">Cancel</Button>
      </div>
    </div>
  );
}

export function PromotionsPanel() {
  const [sales, setSales] = useState<Promo[]>([]);
  const [coupons, setCoupons] = useState<Promo[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ kind: 'sale' | 'coupon'; form: FormState } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, a] = await Promise.all([
        adminApi<{ data: Promo[] }>('sales.list'),
        adminApi<{ data: Promo[] }>('coupons.list'),
        adminApi<{ data: Artwork[] }>('artworks.list'),
      ]);
      setSales(s.data || []); setCoupons(c.data || []); setArtworks(a.data || []);
    } catch (err) {
      toast.error(`Could not load promotions: ${(err as Error).message}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing) return;
    const { kind, form } = editing;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        applies_to: form.applies_to,
        sections: form.sections,
        artwork_ids: form.artwork_ids,
        starts_at: toIso(form.starts_at),
        ends_at: toIso(form.ends_at),
        active: form.active,
      };
      if (kind === 'sale') payload.name = form.name;
      else Object.assign(payload, {
        code: form.code,
        min_subtotal: form.min_subtotal ? Number(form.min_subtotal) : 0,
        exclude_sale_items: form.exclude_sale_items,
        max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
      });
      await adminApi(kind === 'sale' ? 'sales.save' : 'coupons.save', { id: form.id, payload });
      toast.success(kind === 'sale' ? 'Sale saved.' : 'Coupon saved.');
      setEditing(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
    setSaving(false);
  }

  async function remove(kind: 'sale' | 'coupon', p: Promo) {
    if (!confirm(`Delete this ${kind === 'sale' ? 'sale' : 'coupon'}? This cannot be undone.`)) return;
    try {
      await adminApi(kind === 'sale' ? 'sales.delete' : 'coupons.delete', { id: p.id });
      toast.success('Deleted.');
      load();
    } catch (err) { toast.error((err as Error).message); }
  }

  async function toggleActive(kind: 'sale' | 'coupon', p: Promo) {
    // saves straight away with the switch flipped
    try {
      const payload: Record<string, unknown> = {
        discount_type: p.discount_type, discount_value: p.discount_value, applies_to: p.applies_to,
        sections: p.sections, artwork_ids: p.artwork_ids, starts_at: p.starts_at, ends_at: p.ends_at, active: !p.active,
      };
      if (kind === 'sale') payload.name = p.name;
      else Object.assign(payload, { code: p.code, min_subtotal: p.min_subtotal ?? 0, exclude_sale_items: p.exclude_sale_items ?? false, max_redemptions: p.max_redemptions ?? null });
      await adminApi(kind === 'sale' ? 'sales.save' : 'coupons.save', { id: p.id, payload });
      load();
    } catch (err) { toast.error((err as Error).message); }
  }

  const copy = (text: string, what: string) =>
    navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied.`), () => toast.error('Could not copy.'));

  if (loading) return <PageLoader />;

  const Row = ({ kind, p }: { kind: 'sale' | 'coupon'; p: Promo }) => {
    const st = status(p);
    return (
      <div className="flex items-start gap-3 py-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif text-base text-art-charcoal">{kind === 'sale' ? p.name : p.code}</p>
            <span className={`font-sans text-[9px] tracking-widest uppercase px-1.5 py-0.5 ${st.className}`}>{st.label}</span>
          </div>
          <p className="font-sans text-xs text-art-muted">{describe(p, artworks)}</p>
          <p className="font-sans text-[11px] text-art-light">
            {p.starts_at ? `From ${formatDate(p.starts_at)}` : 'Starts immediately'} · {p.ends_at ? `until ${formatDate(p.ends_at)}` : 'no end date'}
            {kind === 'coupon' && <> · used {p.redemptions ?? 0}{p.max_redemptions != null ? ` of ${p.max_redemptions}` : ''} times{(p.min_subtotal ?? 0) > 0 ? ` · min ${formatPrice(p.min_subtotal!)}` : ''}{p.exclude_sale_items ? ' · not on sale items' : ''}</>}
          </p>
          {kind === 'coupon' && p.code && (
            <div className="flex gap-4 pt-1">
              <button onClick={() => copy(p.code!, 'Code')} className="flex items-center gap-1 font-sans text-xs text-art-muted hover:text-art-charcoal"><Copy size={12} /> Copy code</button>
              <button onClick={() => copy(`${window.location.origin}/?coupon=${p.code}`, 'Link')} className="flex items-center gap-1 font-sans text-xs text-art-muted hover:text-art-charcoal"><Copy size={12} /> Copy link</button>
            </div>
          )}
        </div>
        <div className="flex items-center shrink-0">
          <button onClick={() => toggleActive(kind, p)} className="font-sans text-[10px] tracking-widest uppercase text-art-muted hover:text-art-charcoal px-2 py-2">
            {p.active ? 'Pause' : 'Resume'}
          </button>
          <button onClick={() => setEditing({ kind, form: toForm(p) })} className="p-2 text-art-muted hover:text-art-charcoal" aria-label="Edit"><Edit2 size={14} strokeWidth={1.5} /></button>
          <button onClick={() => remove(kind, p)} className="p-2 text-art-muted hover:text-red-500" aria-label="Delete"><Trash2 size={14} strokeWidth={1.5} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-14">
      {editing && (
        <PromoForm
          kind={editing.kind}
          form={editing.form}
          set={patch => setEditing(e => (e ? { ...e, form: { ...e.form, ...patch } } : e))}
          artworks={artworks}
          saving={saving}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      <section>
        <div className="flex items-center justify-between mb-2 gap-3">
          <div>
            <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">Sales <span className="text-art-muted text-base">({sales.length})</span></h2>
            <p className="font-sans text-xs text-art-muted mt-1 max-w-xl">
              Prices drop automatically on the site while a sale runs. If several sales cover the same item, the biggest saving applies.
            </p>
          </div>
          <Button size="sm" onClick={() => setEditing({ kind: 'sale', form: { ...blank } })}><Plus size={13} strokeWidth={1.5} /><span className="ml-1">New sale</span></Button>
        </div>
        <div className="divide-y divide-art-pale">
          {sales.map(p => <Row key={p.id} kind="sale" p={p} />)}
          {sales.length === 0 && <p className="font-serif text-lg font-light text-art-muted py-10 text-center">No sales yet.</p>}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2 gap-3">
          <div>
            <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">Coupon codes <span className="text-art-muted text-base">({coupons.length})</span></h2>
            <p className="font-sans text-xs text-art-muted mt-1 max-w-xl">
              Customers type a code in their cart, or open your shared link to have it applied. A code takes off the sale price, not the list price.
            </p>
          </div>
          <Button size="sm" onClick={() => setEditing({ kind: 'coupon', form: { ...blank, code: randomCode() } })}><Plus size={13} strokeWidth={1.5} /><span className="ml-1">New code</span></Button>
        </div>
        <div className="divide-y divide-art-pale">
          {coupons.map(p => <Row key={p.id} kind="coupon" p={p} />)}
          {coupons.length === 0 && <p className="font-serif text-lg font-light text-art-muted py-10 text-center">No codes yet.</p>}
        </div>
      </section>
    </div>
  );
}
