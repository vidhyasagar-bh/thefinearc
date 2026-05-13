import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Eye, Package, MessageSquare,
  BarChart2, RefreshCw, LogOut, Lock, TrendingUp, ChevronDown,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { PageLoader } from '../components/ui/LoadingSpinner';
import type { Artwork, ArtworkCategory, CommissionInquiry } from '../types';
import { formatPrice, formatDate } from '../utils/format';
import { sendEmail } from '../lib/emailService';
import toast from 'react-hot-toast';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { mockArtworks } from '../lib/mockData';

type AdminTab = 'artworks' | 'orders' | 'commissions' | 'analytics';

interface ArtworkFormState {
  title: string; description: string; story: string; price: string;
  dimensions: string; materials: string; category: ArtworkCategory;
  images: string[]; availability: 'available' | 'sold' | 'reserved';
  framing: string; year: string;
}

interface Order {
  id: string; customer_name: string; customer_email: string;
  customer_address: Record<string, string>;
  items: { artwork_title: string; quantity: number; price: number }[];
  total: number; payment_status: string; fulfillment_status: string; created_at: string;
}

interface AnalyticsData {
  totalRevenue: number; totalOrders: number;
  artworkCounts: { available: number; reserved: number; sold: number; total: number };
  commissionCounts: { pending: number; accepted: number; declined: number; total: number };
  recentOrders: Order[];
}

const emptyArtwork: ArtworkFormState = {
  title: '', description: '', story: '', price: '', dimensions: '', materials: '',
  category: 'painting', images: [''], availability: 'available', framing: '',
  year: new Date().getFullYear().toString(),
};

const statusColors: Record<string, string> = {
  pending:    'bg-yellow-50 text-yellow-700',
  accepted:   'bg-green-50 text-green-700',
  declined:   'bg-red-50 text-red-600',
  paid:       'bg-green-50 text-green-700',
  failed:     'bg-red-50 text-red-600',
  refunded:   'bg-gray-100 text-gray-600',
  available:  'bg-green-50 text-green-700',
  sold:       'bg-red-50 text-red-600',
  reserved:   'bg-yellow-50 text-yellow-700',
  processing: 'bg-blue-50 text-blue-700',
  confirmed:  'bg-indigo-50 text-indigo-700',
  preparing:  'bg-purple-50 text-purple-700',
  shipped:    'bg-teal-50 text-teal-700',
  delivered:  'bg-green-50 text-green-700',
};

// Coloured pill dropdown — appearance:none keeps the badge look,
// ChevronDown overlay signals it's interactive on every platform.
function StatusSelect({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`appearance-none font-sans text-[10px] tracking-widest uppercase pl-2.5 pr-6 py-1.5 rounded-sm cursor-pointer focus:outline-none ${statusColors[value] || 'bg-gray-100 text-gray-600'}`}
        style={{ touchAction: 'manipulation' }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={9} strokeWidth={2.5} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50" />
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const correct = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';
    if (password === correct) { sessionStorage.setItem('admin_auth', '1'); onSuccess(); }
    else { setError(true); setPassword(''); }
  }

  return (
    <div className="min-h-screen bg-art-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><Lock size={20} strokeWidth={1.5} className="text-art-muted" /></div>
          <h1 className="font-serif text-3xl font-light text-art-charcoal">Admin Access</h1>
          <p className="font-sans text-sm text-art-muted">The Fine Arc</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <Input label="Password" type="password" value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }} autoFocus required />
            {error && <p className="font-sans text-xs text-red-500 pt-1">Incorrect password.</p>}
          </div>
          <Button type="submit" size="lg" className="w-full">Enter Dashboard</Button>
        </form>
        <p className="font-sans text-center text-[10px] text-art-light">
          Set <code className="text-art-muted">VITE_ADMIN_PASSWORD</code> in your environment.
        </p>
      </div>
    </div>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────────────
export function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === '1');
  const [tab, setTab] = useState<AdminTab>('artworks');
  const navigate = useNavigate();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artworksLoading, setArtworksLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyArtwork);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [commissions, setCommissions] = useState<CommissionInquiry[]>([]);
  const [commissionsLoading, setCommissionsLoading] = useState(false);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;

  function signOut() { sessionStorage.removeItem('admin_auth'); navigate('/'); }

  return (
    <AdminDashboard
      tab={tab} setTab={setTab} signOut={signOut}
      artworks={artworks} setArtworks={setArtworks}
      artworksLoading={artworksLoading} setArtworksLoading={setArtworksLoading}
      showForm={showForm} setShowForm={setShowForm}
      editingId={editingId} setEditingId={setEditingId}
      form={form} setForm={setForm}
      orders={orders} setOrders={setOrders}
      ordersLoading={ordersLoading} setOrdersLoading={setOrdersLoading}
      commissions={commissions} setCommissions={setCommissions}
      commissionsLoading={commissionsLoading} setCommissionsLoading={setCommissionsLoading}
      analytics={analytics} setAnalytics={setAnalytics}
      analyticsLoading={analyticsLoading} setAnalyticsLoading={setAnalyticsLoading}
    />
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function AdminDashboard({
  tab, setTab, signOut,
  artworks, setArtworks, artworksLoading, setArtworksLoading,
  showForm, setShowForm, editingId, setEditingId, form, setForm,
  orders, setOrders, ordersLoading, setOrdersLoading,
  commissions, setCommissions, commissionsLoading, setCommissionsLoading,
  analytics, setAnalytics, analyticsLoading, setAnalyticsLoading,
}: {
  tab: AdminTab; setTab: (t: AdminTab) => void; signOut: () => void;
  artworks: Artwork[]; setArtworks: (a: Artwork[]) => void;
  artworksLoading: boolean; setArtworksLoading: (v: boolean) => void;
  showForm: boolean; setShowForm: (v: boolean) => void;
  editingId: string | null; setEditingId: (v: string | null) => void;
  form: ArtworkFormState; setForm: (f: ArtworkFormState) => void;
  orders: Order[]; setOrders: (o: Order[]) => void;
  ordersLoading: boolean; setOrdersLoading: (v: boolean) => void;
  commissions: CommissionInquiry[]; setCommissions: (c: CommissionInquiry[]) => void;
  commissionsLoading: boolean; setCommissionsLoading: (v: boolean) => void;
  analytics: AnalyticsData | null; setAnalytics: (a: AnalyticsData | null) => void;
  analyticsLoading: boolean; setAnalyticsLoading: (v: boolean) => void;
}) {
  // ── data fetchers ────────────────────────────────────────────────────────────
  const fetchArtworks = useCallback(async () => {
    setArtworksLoading(true);
    if (!supabaseConfigured) { setArtworks(mockArtworks); setArtworksLoading(false); return; }
    const { data, error } = await supabase.from('artworks').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load artworks.');
    else setArtworks((data as Artwork[]) || []);
    setArtworksLoading(false);
  }, [setArtworks, setArtworksLoading]);

  const fetchOrders = useCallback(async () => {
    if (!supabaseConfigured) return;
    setOrdersLoading(true);
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load orders.');
    else setOrders((data as Order[]) || []);
    setOrdersLoading(false);
  }, [setOrders, setOrdersLoading]);

  const fetchCommissions = useCallback(async () => {
    if (!supabaseConfigured) return;
    setCommissionsLoading(true);
    const { data, error } = await supabase.from('commission_inquiries').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load commissions.');
    else setCommissions((data as CommissionInquiry[]) || []);
    setCommissionsLoading(false);
  }, [setCommissions, setCommissionsLoading]);

  const fetchAnalytics = useCallback(async () => {
    if (!supabaseConfigured) return;
    setAnalyticsLoading(true);
    try {
      const [ar, or_, cr] = await Promise.all([
        supabase.from('artworks').select('availability'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('commission_inquiries').select('status'),
      ]);
      const aRows = (ar.data  || []) as { availability: string }[];
      const oRows = (or_.data || []) as Order[];
      const cRows = (cr.data  || []) as { status: string }[];
      setAnalytics({
        totalRevenue: oRows.reduce((s, o) => s + Number(o.total || 0), 0),
        totalOrders: oRows.length,
        artworkCounts: {
          available: aRows.filter(a => a.availability === 'available').length,
          reserved:  aRows.filter(a => a.availability === 'reserved').length,
          sold:      aRows.filter(a => a.availability === 'sold').length,
          total: aRows.length,
        },
        commissionCounts: {
          pending:  cRows.filter(c => c.status === 'pending').length,
          accepted: cRows.filter(c => c.status === 'accepted').length,
          declined: cRows.filter(c => c.status === 'declined').length,
          total: cRows.length,
        },
        recentOrders: oRows.slice(0, 5),
      });
    } catch { toast.error('Failed to load analytics.'); }
    setAnalyticsLoading(false);
  }, [setAnalytics, setAnalyticsLoading]);

  useEffect(() => {
    if (tab === 'artworks')    fetchArtworks();
    if (tab === 'orders')      fetchOrders();
    if (tab === 'commissions') fetchCommissions();
    if (tab === 'analytics')   fetchAnalytics();
  }, [tab, fetchArtworks, fetchOrders, fetchCommissions, fetchAnalytics]);

  // ── artwork form ─────────────────────────────────────────────────────────────
  function updateForm(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  async function handleSave() {
    if (!form.title || !form.price) { toast.error('Title and price are required.'); return; }
    try {
      const payload = {
        title: form.title, description: form.description, story: form.story || null,
        price: parseFloat(form.price), dimensions: form.dimensions, materials: form.materials,
        category: form.category, images: form.images.filter(Boolean),
        availability: form.availability, framing: form.framing || null,
        year: parseInt(form.year) || null,
      };
      if (supabaseConfigured) {
        const { error } = editingId
          ? await supabase.from('artworks').update(payload).eq('id', editingId)
          : await supabase.from('artworks').insert(payload);
        if (error) throw error;
      }
      toast.success(editingId ? 'Artwork updated.' : 'Artwork added.');
      setShowForm(false); setEditingId(null); setForm(emptyArtwork);
      fetchArtworks();
    } catch { toast.error('Failed to save.'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this artwork? This cannot be undone.')) return;
    try {
      if (supabaseConfigured) {
        const { error } = await supabase.from('artworks').delete().eq('id', id);
        if (error) throw error;
      }
      toast.success('Artwork deleted.');
      setArtworks(artworks.filter(a => a.id !== id));
    } catch { toast.error('Failed to delete.'); }
  }

  function startEdit(artwork: Artwork) {
    setForm({
      title: artwork.title, description: artwork.description, story: artwork.story || '',
      price: artwork.price.toString(), dimensions: artwork.dimensions,
      materials: artwork.materials, category: artwork.category,
      images: artwork.images.length ? artwork.images : [''],
      availability: artwork.availability, framing: artwork.framing || '',
      year: artwork.year?.toString() || '',
    });
    setEditingId(artwork.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── status updates ───────────────────────────────────────────────────────────
  async function updateCommissionStatus(id: string, status: string) {
    if (!supabaseConfigured) return;
    try {
      const commission = commissions.find(c => c.id === id);
      const { error } = await supabase.from('commission_inquiries').update({ status }).eq('id', id);
      if (error) throw error;
      setCommissions(commissions.map(c =>
        c.id === id ? { ...c, status: status as CommissionInquiry['status'] } : c
      ));
      if ((status === 'accepted' || status === 'declined') && commission) {
        await sendEmail(
          status === 'accepted' ? 'commission_accepted' : 'commission_declined',
          { name: commission.name, email: commission.email }
        );
      }
      toast.success('Status updated.');
    } catch { toast.error('Failed to update status.'); }
  }

  async function updateOrderFulfillment(id: string, fulfillment_status: string) {
    if (!supabaseConfigured) return;
    try {
      const { error } = await supabase.from('orders').update({ fulfillment_status }).eq('id', id);
      if (error) throw error;
      setOrders(orders.map(o => o.id === id ? { ...o, fulfillment_status } : o));
      toast.success('Order updated.');
    } catch { toast.error('Failed to update order.'); }
  }

  // ── tab config ───────────────────────────────────────────────────────────────
  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'artworks',    label: 'Artworks',    icon: <Eye size={16} strokeWidth={1.5} /> },
    { key: 'orders',      label: 'Orders',      icon: <Package size={16} strokeWidth={1.5} /> },
    { key: 'commissions', label: 'Commissions', icon: <MessageSquare size={16} strokeWidth={1.5} /> },
    { key: 'analytics',   label: 'Analytics',   icon: <BarChart2 size={16} strokeWidth={1.5} /> },
  ];

  // ── commission card ──────────────────────────────────────────────────────────
  function CommissionCard({ c }: { c: CommissionInquiry }) {
    return (
      <div className="border border-art-pale p-4 md:p-5 space-y-3">
        {/* Row 1: name + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-sm md:text-base text-art-charcoal">{c.name}</p>
            <a href={`mailto:${c.email}`}
              className="font-sans text-xs text-art-muted hover:text-art-charcoal transition-colors block truncate max-w-[200px] sm:max-w-sm mt-0.5">
              {c.email}
            </a>
            {c.phone && (
              <a href={`tel:${c.phone}`}
                className="font-sans text-xs text-art-muted hover:text-art-charcoal transition-colors block mt-0.5">
                {c.phone}
              </a>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatusSelect
              value={c.status}
              onChange={v => updateCommissionStatus(c.id, v)}
              options={[
                { value: 'pending',  label: 'Pending'  },
                { value: 'accepted', label: 'Accepted' },
                { value: 'declined', label: 'Declined' },
              ]}
            />
            <p className="font-sans text-[10px] text-art-light">{formatDate(c.created_at)}</p>
          </div>
        </div>

        {/* Description */}
        <p className="font-sans text-sm text-art-warm leading-relaxed">{c.project_description}</p>

        {/* Details */}
        {(c.size_preferences || c.color_preferences) && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-art-pale">
            {c.size_preferences && (
              <div>
                <p className="font-sans text-[9px] tracking-widest uppercase text-art-muted">Size</p>
                <p className="font-sans text-xs text-art-charcoal mt-0.5">{c.size_preferences}</p>
              </div>
            )}
            {c.color_preferences && (
              <div>
                <p className="font-sans text-[9px] tracking-widest uppercase text-art-muted">Colour</p>
                <p className="font-sans text-xs text-art-charcoal mt-0.5">{c.color_preferences}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-art-white overflow-x-hidden">

      {/* Top bar */}
      <div className="border-b border-art-pale sticky top-0 bg-art-white z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-10 flex items-center justify-between h-14 gap-3">
          <p className="font-serif text-sm md:text-lg font-light text-art-charcoal whitespace-nowrap">
            Fine Arc · Admin
          </p>
          <div className="flex items-center gap-3 md:gap-5">
            <a href="/"
              className="font-sans text-[10px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors whitespace-nowrap">
              View Site
            </a>
            <button onClick={signOut}
              className="flex items-center gap-1.5 font-sans text-[10px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors"
              aria-label="Sign out">
              <LogOut size={13} strokeWidth={1.5} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-5 md:py-10">

        {/*
          Tabs — no horizontal scroll. On mobile: equal-width columns, icon only.
          On sm+: natural width, icon + label.
        */}
        <div className="flex border-b border-art-pale mb-7 md:mb-10">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-2 font-sans text-[10px] tracking-widest uppercase sm:px-5 py-3 border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-art-charcoal text-art-charcoal'
                  : 'border-transparent text-art-muted hover:text-art-charcoal'
              }`}
            >
              {t.icon}
              {/* Text hidden on mobile so 4 tabs fit without scrolling */}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── ARTWORKS ──────────────────────────────────────────────────────── */}
        {tab === 'artworks' && (
          <div>
            <div className="flex items-center justify-between mb-5 md:mb-8 gap-3">
              <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">
                Artworks <span className="text-art-muted text-base">({artworks.length})</span>
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={fetchArtworks}
                  className="p-2 text-art-muted hover:text-art-charcoal transition-colors" aria-label="Refresh">
                  <RefreshCw size={14} strokeWidth={1.5} />
                </button>
                <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyArtwork); }}>
                  <Plus size={13} strokeWidth={1.5} />
                  <span className="hidden xs:inline ml-1">Add</span>
                </Button>
              </div>
            </div>

            {showForm && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 md:p-8 border border-art-pale bg-cream-50 space-y-5">
                <h3 className="font-serif text-xl font-light text-art-charcoal">
                  {editingId ? 'Edit Artwork' : 'New Artwork'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input label="Title *" value={form.title} onChange={e => updateForm('title', e.target.value)} />
                  <Input label="Price *" type="number" value={form.price}
                    onChange={e => updateForm('price', e.target.value)} placeholder="2400" />
                  <Input label="Dimensions" value={form.dimensions}
                    onChange={e => updateForm('dimensions', e.target.value)} placeholder="80 × 100 cm" />
                  <Input label="Materials" value={form.materials}
                    onChange={e => updateForm('materials', e.target.value)} placeholder="Oil on linen" />
                  <Input label="Year" value={form.year} onChange={e => updateForm('year', e.target.value)} />
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-art-muted mb-2 font-sans">Category</label>
                    <select value={form.category} onChange={e => updateForm('category', e.target.value)}
                      className="w-full bg-transparent border-b border-art-light text-art-charcoal font-sans text-sm py-3 focus:outline-none focus:border-art-charcoal">
                      {['painting','drawing','print','photography','mixed-media','sculpture'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-art-muted mb-2 font-sans">Availability</label>
                    <select value={form.availability} onChange={e => updateForm('availability', e.target.value)}
                      className="w-full bg-transparent border-b border-art-light text-art-charcoal font-sans text-sm py-3 focus:outline-none focus:border-art-charcoal">
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="reserved">Reserved</option>
                    </select>
                  </div>
                  <Input label="Framing" value={form.framing}
                    onChange={e => updateForm('framing', e.target.value)} placeholder="Unframed" />
                </div>
                <Input label="Image URL (primary)" value={form.images[0]}
                  onChange={e => setForm({ ...form, images: [e.target.value, ...form.images.slice(1)] })}
                  placeholder="https://..." />
                <Textarea label="Description" value={form.description}
                  onChange={e => updateForm('description', e.target.value)} rows={3} />
                <Textarea label="Story (italic quote)" value={form.story}
                  onChange={e => updateForm('story', e.target.value)} rows={2} />
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <Button onClick={handleSave} className="w-full sm:w-auto">
                    {editingId ? 'Save Changes' : 'Add Artwork'}
                  </Button>
                  <Button variant="secondary" className="w-full sm:w-auto"
                    onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
                </div>
                {!supabaseConfigured && (
                  <p className="font-sans text-xs text-art-muted">⚠ Demo mode — connect Supabase to persist changes.</p>
                )}
              </motion.div>
            )}

            {artworksLoading ? <PageLoader /> : (
              <div className="divide-y divide-art-pale">
                {artworks.map(artwork => (
                  <div key={artwork.id} className="flex items-center gap-3 py-3.5">
                    <div className="w-11 h-11 md:w-14 md:h-14 shrink-0 overflow-hidden bg-cream-100">
                      <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-sm md:text-base text-art-charcoal truncate">{artwork.title}</p>
                      <p className="font-sans text-xs text-art-muted truncate">{artwork.category} · {artwork.dimensions}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-sans text-xs text-art-charcoal">{formatPrice(artwork.price)}</span>
                        <span className={`font-sans text-[9px] tracking-widest uppercase px-1.5 py-0.5 ${statusColors[artwork.availability]}`}>
                          {artwork.availability}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center shrink-0">
                      <button onClick={() => startEdit(artwork)}
                        className="p-2 text-art-muted hover:text-art-charcoal transition-colors" aria-label="Edit">
                        <Edit2 size={14} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => handleDelete(artwork.id)}
                        className="p-2 text-art-muted hover:text-red-500 transition-colors" aria-label="Delete">
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
                {artworks.length === 0 && (
                  <p className="font-serif text-xl font-light text-art-muted py-16 text-center">No artworks yet.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ────────────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-5 md:mb-8 gap-3">
              <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">
                Orders <span className="text-art-muted text-base">({orders.length})</span>
              </h2>
              <button onClick={fetchOrders}
                className="p-2 text-art-muted hover:text-art-charcoal transition-colors shrink-0" aria-label="Refresh">
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>

            {!supabaseConfigured ? (
              <p className="font-serif text-lg font-light text-art-muted py-16 text-center">Connect Supabase to view orders.</p>
            ) : ordersLoading ? <PageLoader /> : orders.length === 0 ? (
              <p className="font-serif text-lg font-light text-art-muted py-16 text-center">No orders yet.</p>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="border border-art-pale p-4 md:p-6 space-y-4">
                    {/* Customer + total */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-serif text-base text-art-charcoal">{order.customer_name}</p>
                        <a href={`mailto:${order.customer_email}`}
                          className="font-sans text-xs text-art-muted hover:text-art-charcoal transition-colors block truncate mt-0.5">
                          {order.customer_email}
                        </a>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`font-sans text-[9px] tracking-widest uppercase px-2 py-1 ${statusColors[order.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                          {order.payment_status}
                        </span>
                        <p className="font-sans text-sm font-medium text-art-charcoal">{formatPrice(order.total)}</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-1">
                      {(order.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between gap-3 font-sans text-xs text-art-muted">
                          <span className="truncate min-w-0">{item.artwork_title} × {item.quantity}</span>
                          <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Progress + address */}
                    <div className="pt-3 border-t border-art-pale space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Progress</span>
                        <StatusSelect
                          value={order.fulfillment_status || 'processing'}
                          onChange={v => updateOrderFulfillment(order.id, v)}
                          options={[
                            { value: 'processing', label: 'Processing' },
                            { value: 'confirmed',  label: 'Confirmed'  },
                            { value: 'preparing',  label: 'Preparing'  },
                            { value: 'shipped',    label: 'Shipped'    },
                            { value: 'delivered',  label: 'Delivered'  },
                          ]}
                        />
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="font-sans text-xs text-art-muted min-w-0 break-words">
                          {[
                            order.customer_address?.line1, order.customer_address?.city,
                            order.customer_address?.postal_code, order.customer_address?.country,
                          ].filter(Boolean).join(', ')}
                        </p>
                        <p className="font-sans text-xs text-art-light shrink-0">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── COMMISSIONS ───────────────────────────────────────────────────── */}
        {tab === 'commissions' && (
          <div>
            <div className="flex items-center justify-between mb-5 md:mb-8 gap-3">
              <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">
                Commissions <span className="text-art-muted text-base">({commissions.length})</span>
              </h2>
              <button onClick={fetchCommissions}
                className="p-2 text-art-muted hover:text-art-charcoal transition-colors shrink-0" aria-label="Refresh">
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>

            {!supabaseConfigured ? (
              <p className="font-serif text-lg font-light text-art-muted py-16 text-center">Connect Supabase to view commission inquiries.</p>
            ) : commissionsLoading ? <PageLoader /> : commissions.length === 0 ? (
              <p className="font-serif text-lg font-light text-art-muted py-16 text-center">No inquiries yet.</p>
            ) : (
              <div className="space-y-10">
                {/* Pending */}
                {(() => {
                  const group = commissions.filter(c => c.status === 'pending');
                  if (group.length === 0) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-sans text-[10px] tracking-widest uppercase text-art-charcoal">Pending</h3>
                        <span className="font-sans text-[10px] px-2 py-0.5 bg-yellow-50 text-yellow-700">{group.length}</span>
                      </div>
                      {group.map(c => <CommissionCard key={c.id} c={c} />)}
                    </div>
                  );
                })()}

                {/* Accepted */}
                {(() => {
                  const group = commissions.filter(c => c.status === 'accepted');
                  if (group.length === 0) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-sans text-[10px] tracking-widest uppercase text-art-charcoal">Accepted</h3>
                        <span className="font-sans text-[10px] px-2 py-0.5 bg-green-50 text-green-700">{group.length}</span>
                      </div>
                      {group.map(c => <CommissionCard key={c.id} c={c} />)}
                    </div>
                  );
                })()}

                {/* Declined */}
                {(() => {
                  const group = commissions.filter(c => c.status === 'declined');
                  if (group.length === 0) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-sans text-[10px] tracking-widest uppercase text-art-charcoal">Declined</h3>
                        <span className="font-sans text-[10px] px-2 py-0.5 bg-red-50 text-red-600">{group.length}</span>
                      </div>
                      {group.map(c => <CommissionCard key={c.id} c={c} />)}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ─────────────────────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div>
            <div className="flex items-center justify-between mb-5 md:mb-8 gap-3">
              <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">Analytics</h2>
              <button onClick={fetchAnalytics}
                className="p-2 text-art-muted hover:text-art-charcoal transition-colors shrink-0" aria-label="Refresh">
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>

            {!supabaseConfigured ? (
              <p className="font-serif text-lg font-light text-art-muted py-16 text-center">Connect Supabase to view analytics.</p>
            ) : analyticsLoading ? <PageLoader /> : !analytics ? null : (
              <div className="space-y-6 md:space-y-10">
                {/* Metric cards — 2 col on mobile, 4 on lg */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Revenue',    value: formatPrice(analytics.totalRevenue),        icon: <TrendingUp size={14} strokeWidth={1.5} /> },
                    { label: 'Orders',     value: String(analytics.totalOrders),               icon: <Package size={14} strokeWidth={1.5} /> },
                    { label: 'Available',  value: String(analytics.artworkCounts.available),   icon: <Eye size={14} strokeWidth={1.5} /> },
                    { label: 'Pending',    value: String(analytics.commissionCounts.pending),  icon: <MessageSquare size={14} strokeWidth={1.5} /> },
                  ].map(stat => (
                    <div key={stat.label} className="border border-art-pale p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-sans text-[9px] tracking-widest uppercase text-art-muted">{stat.label}</p>
                        <span className="text-art-light">{stat.icon}</span>
                      </div>
                      <p className="font-serif text-2xl md:text-3xl font-light text-art-charcoal leading-none break-all">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Breakdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      title: `Artworks (${analytics.artworkCounts.total})`,
                      bars: [
                        { label: 'Available', count: analytics.artworkCounts.available, total: analytics.artworkCounts.total, color: 'bg-green-400' },
                        { label: 'Reserved',  count: analytics.artworkCounts.reserved,  total: analytics.artworkCounts.total, color: 'bg-yellow-400' },
                        { label: 'Sold',      count: analytics.artworkCounts.sold,      total: analytics.artworkCounts.total, color: 'bg-red-400' },
                      ],
                    },
                    {
                      title: `Commissions (${analytics.commissionCounts.total})`,
                      bars: [
                        { label: 'Pending',  count: analytics.commissionCounts.pending,  total: analytics.commissionCounts.total, color: 'bg-yellow-400' },
                        { label: 'Accepted', count: analytics.commissionCounts.accepted, total: analytics.commissionCounts.total, color: 'bg-green-400' },
                        { label: 'Declined', count: analytics.commissionCounts.declined, total: analytics.commissionCounts.total, color: 'bg-red-400' },
                      ],
                    },
                  ].map(section => (
                    <div key={section.title} className="border border-art-pale p-5 space-y-4">
                      <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted">{section.title}</p>
                      <div className="space-y-3">
                        {section.bars.map(({ label, count, total, color }) => {
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                          return (
                            <div key={label} className="space-y-1">
                              <div className="flex justify-between">
                                <span className="font-sans text-xs text-art-warm">{label}</span>
                                <span className="font-sans text-xs text-art-charcoal">{count}</span>
                              </div>
                              <div className="h-1.5 bg-art-pale rounded-full overflow-hidden">
                                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent orders */}
                {analytics.recentOrders.length > 0 && (
                  <div className="border border-art-pale p-5 space-y-3">
                    <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Recent Orders</p>
                    <div className="divide-y divide-art-pale">
                      {analytics.recentOrders.map(order => (
                        <div key={order.id} className="flex items-start justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="font-serif text-sm text-art-charcoal">{order.customer_name}</p>
                            <p className="font-sans text-xs text-art-muted truncate max-w-[160px] sm:max-w-xs">
                              {(order.items || []).map(i => i.artwork_title).join(', ')}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`font-sans text-[9px] tracking-widest uppercase px-1.5 py-0.5 ${statusColors[order.fulfillment_status || 'processing']}`}>
                              {order.fulfillment_status || 'processing'}
                            </span>
                            <span className="font-sans text-sm text-art-charcoal">{formatPrice(order.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
