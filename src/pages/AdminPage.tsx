import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Eye, Package, MessageSquare, BarChart2, RefreshCw, LogOut, Lock, TrendingUp } from 'lucide-react';
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
  title: string;
  description: string;
  story: string;
  price: string;
  dimensions: string;
  materials: string;
  category: ArtworkCategory;
  images: string[];
  availability: 'available' | 'sold' | 'reserved';
  framing: string;
  year: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_address: Record<string, string>;
  items: { artwork_title: string; quantity: number; price: number }[];
  total: number;
  payment_status: string;
  fulfillment_status: string;
  created_at: string;
}

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
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

// ── Login Gate ─────────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const correct = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';
    if (password === correct) {
      sessionStorage.setItem('admin_auth', '1');
      onSuccess();
    } else {
      setError(true);
      setPassword('');
    }
  }

  return (
    <div className="min-h-screen bg-art-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Lock size={20} strokeWidth={1.5} className="text-art-muted" />
          </div>
          <h1 className="font-serif text-3xl font-light text-art-charcoal">Admin Access</h1>
          <p className="font-sans text-sm text-art-muted">The Fine Arc</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              autoFocus
              required
            />
            {error && (
              <p className="font-sans text-xs text-red-500 pt-1">Incorrect password.</p>
            )}
          </div>
          <Button type="submit" size="lg" className="w-full">
            Enter Dashboard
          </Button>
        </form>

        <p className="font-sans text-center text-[10px] text-art-light">
          Set <code className="text-art-muted">VITE_ADMIN_PASSWORD</code> in your environment to change the password.
        </p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
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

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  function signOut() {
    sessionStorage.removeItem('admin_auth');
    navigate('/');
  }

  return <AdminDashboard
    tab={tab} setTab={setTab} signOut={signOut}
    artworks={artworks} setArtworks={setArtworks} artworksLoading={artworksLoading} setArtworksLoading={setArtworksLoading}
    showForm={showForm} setShowForm={setShowForm} editingId={editingId} setEditingId={setEditingId}
    form={form} setForm={setForm}
    orders={orders} setOrders={setOrders} ordersLoading={ordersLoading} setOrdersLoading={setOrdersLoading}
    commissions={commissions} setCommissions={setCommissions} commissionsLoading={commissionsLoading} setCommissionsLoading={setCommissionsLoading}
    analytics={analytics} setAnalytics={setAnalytics} analyticsLoading={analyticsLoading} setAnalyticsLoading={setAnalyticsLoading}
  />;
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
  artworks: Artwork[]; setArtworks: (a: Artwork[]) => void; artworksLoading: boolean; setArtworksLoading: (v: boolean) => void;
  showForm: boolean; setShowForm: (v: boolean) => void; editingId: string | null; setEditingId: (v: string | null) => void;
  form: ArtworkFormState; setForm: (f: ArtworkFormState) => void;
  orders: Order[]; setOrders: (o: Order[]) => void; ordersLoading: boolean; setOrdersLoading: (v: boolean) => void;
  commissions: CommissionInquiry[]; setCommissions: (c: CommissionInquiry[]) => void; commissionsLoading: boolean; setCommissionsLoading: (v: boolean) => void;
  analytics: AnalyticsData | null; setAnalytics: (a: AnalyticsData | null) => void; analyticsLoading: boolean; setAnalyticsLoading: (v: boolean) => void;
}) {
  const fetchArtworks = useCallback(async () => {
    setArtworksLoading(true);
    if (!supabaseConfigured) {
      setArtworks(mockArtworks);
      setArtworksLoading(false);
      return;
    }
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
      const [artworksRes, ordersRes, commissionsRes] = await Promise.all([
        supabase.from('artworks').select('availability'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('commission_inquiries').select('status'),
      ]);

      const artworkRows = (artworksRes.data || []) as { availability: string }[];
      const orderRows = (ordersRes.data || []) as Order[];
      const commissionRows = (commissionsRes.data || []) as { status: string }[];

      const artworkCounts = {
        available: artworkRows.filter(a => a.availability === 'available').length,
        reserved:  artworkRows.filter(a => a.availability === 'reserved').length,
        sold:      artworkRows.filter(a => a.availability === 'sold').length,
        total:     artworkRows.length,
      };
      const commissionCounts = {
        pending:  commissionRows.filter(c => c.status === 'pending').length,
        accepted: commissionRows.filter(c => c.status === 'accepted').length,
        declined: commissionRows.filter(c => c.status === 'declined').length,
        total:    commissionRows.length,
      };
      const totalRevenue = orderRows.reduce((sum, o) => sum + Number(o.total || 0), 0);

      setAnalytics({
        totalRevenue,
        totalOrders: orderRows.length,
        artworkCounts,
        commissionCounts,
        recentOrders: orderRows.slice(0, 5),
      });
    } catch {
      toast.error('Failed to load analytics.');
    }
    setAnalyticsLoading(false);
  }, [setAnalytics, setAnalyticsLoading]);

  useEffect(() => {
    if (tab === 'artworks')   fetchArtworks();
    if (tab === 'orders')     fetchOrders();
    if (tab === 'commissions') fetchCommissions();
    if (tab === 'analytics')  fetchAnalytics();
  }, [tab, fetchArtworks, fetchOrders, fetchCommissions, fetchAnalytics]);

  function updateForm(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  async function handleSave() {
    if (!form.title || !form.price) { toast.error('Title and price are required.'); return; }
    try {
      const data = {
        title: form.title, description: form.description, story: form.story || null,
        price: parseFloat(form.price), dimensions: form.dimensions, materials: form.materials,
        category: form.category, images: form.images.filter(Boolean),
        availability: form.availability, framing: form.framing || null,
        year: parseInt(form.year) || null,
      };
      if (supabaseConfigured) {
        const { error } = editingId
          ? await supabase.from('artworks').update(data).eq('id', editingId)
          : await supabase.from('artworks').insert(data);
        if (error) throw error;
      }
      toast.success(editingId ? 'Artwork updated.' : 'Artwork added.');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyArtwork);
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
      price: artwork.price.toString(), dimensions: artwork.dimensions, materials: artwork.materials,
      category: artwork.category, images: artwork.images.length ? artwork.images : [''],
      availability: artwork.availability, framing: artwork.framing || '',
      year: artwork.year?.toString() || '',
    });
    setEditingId(artwork.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function updateCommissionStatus(id: string, status: string) {
    if (!supabaseConfigured) return;
    try {
      const commission = commissions.find(c => c.id === id);
      const { error } = await supabase.from('commission_inquiries').update({ status }).eq('id', id);
      if (error) throw error;
      setCommissions(commissions.map(c => c.id === id ? { ...c, status: status as CommissionInquiry['status'] } : c));
      if ((status === 'accepted' || status === 'declined') && commission) {
        await sendEmail(status === 'accepted' ? 'commission_accepted' : 'commission_declined', {
          name: commission.name,
          email: commission.email,
        });
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

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'artworks',    label: 'Artworks',    icon: <Eye size={14} strokeWidth={1.5} /> },
    { key: 'orders',      label: 'Orders',      icon: <Package size={14} strokeWidth={1.5} /> },
    { key: 'commissions', label: 'Commissions', icon: <MessageSquare size={14} strokeWidth={1.5} /> },
    { key: 'analytics',   label: 'Analytics',   icon: <BarChart2 size={14} strokeWidth={1.5} /> },
  ];

  return (
    <div className="min-h-screen bg-art-white">
      {/* Top bar */}
      <div className="border-b border-art-pale sticky top-0 bg-art-white z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-10 flex items-center justify-between h-14 md:h-16">
          <p className="font-serif text-base md:text-xl font-light text-art-charcoal">Fine Arc · Admin</p>
          <div className="flex items-center gap-4 md:gap-6">
            <a href="/" className="font-sans text-[10px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors">
              View Site
            </a>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 font-sans text-[10px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={12} strokeWidth={1.5} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-10">
        {/* Tabs */}
        <div className="flex mb-8 md:mb-10 border-b border-art-pale overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 font-sans text-[10px] tracking-widest uppercase px-4 py-3 border-b-2 -mb-px transition-all duration-300 flex-none whitespace-nowrap ${
                tab === t.key
                  ? 'border-art-charcoal text-art-charcoal'
                  : 'border-transparent text-art-muted hover:text-art-charcoal'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ARTWORKS TAB ── */}
        {tab === 'artworks' && (
          <div>
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">
                Artworks ({artworks.length})
              </h2>
              <div className="flex items-center gap-3">
                <button onClick={fetchArtworks} className="text-art-muted hover:text-art-charcoal transition-colors p-1.5" aria-label="Refresh">
                  <RefreshCw size={14} strokeWidth={1.5} />
                </button>
                <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyArtwork); }}>
                  <Plus size={14} strokeWidth={1.5} />
                  <span className="hidden sm:inline">Add Artwork</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-5 md:p-8 border border-art-pale bg-cream-50 space-y-6"
              >
                <h3 className="font-serif text-xl font-light text-art-charcoal">
                  {editingId ? 'Edit Artwork' : 'New Artwork'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Title *" value={form.title} onChange={e => updateForm('title', e.target.value)} />
                  <Input label="Price *" type="number" value={form.price} onChange={e => updateForm('price', e.target.value)} placeholder="2400" />
                  <Input label="Dimensions" value={form.dimensions} onChange={e => updateForm('dimensions', e.target.value)} placeholder="80 × 100 cm" />
                  <Input label="Materials" value={form.materials} onChange={e => updateForm('materials', e.target.value)} placeholder="Oil on linen" />
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
                  <Input label="Framing" value={form.framing} onChange={e => updateForm('framing', e.target.value)} placeholder="Unframed" />
                </div>
                <Input
                  label="Image URL (primary)"
                  value={form.images[0]}
                  onChange={e => setForm({ ...form, images: [e.target.value, ...form.images.slice(1)] })}
                  placeholder="https://..."
                />
                <Textarea label="Description" value={form.description} onChange={e => updateForm('description', e.target.value)} rows={3} />
                <Textarea label="Story (italic quote)" value={form.story} onChange={e => updateForm('story', e.target.value)} rows={2} />
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button onClick={handleSave} className="w-full sm:w-auto">{editingId ? 'Save Changes' : 'Add Artwork'}</Button>
                  <Button variant="secondary" className="w-full sm:w-auto" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
                </div>
                {!supabaseConfigured && (
                  <p className="font-sans text-xs text-art-muted">⚠ Demo mode — connect Supabase to persist changes.</p>
                )}
              </motion.div>
            )}

            {artworksLoading ? <PageLoader /> : (
              <div className="divide-y divide-art-pale">
                {artworks.map(artwork => (
                  <div key={artwork.id} className="flex items-center gap-4 py-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 overflow-hidden bg-cream-100">
                      <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-sm md:text-base text-art-charcoal truncate">{artwork.title}</p>
                      <p className="font-sans text-xs text-art-muted truncate">{artwork.category} · {artwork.dimensions}</p>
                      <div className="flex items-center gap-2 mt-1 md:hidden">
                        <p className="font-sans text-xs text-art-charcoal">{formatPrice(artwork.price)}</p>
                        <span className={`font-sans text-[9px] tracking-widest uppercase px-2 py-0.5 ${statusColors[artwork.availability]}`}>
                          {artwork.availability}
                        </span>
                      </div>
                    </div>
                    <p className="font-sans text-sm text-art-charcoal hidden md:block shrink-0">{formatPrice(artwork.price)}</p>
                    <span className={`font-sans text-[10px] tracking-widest uppercase px-3 py-1 hidden md:block shrink-0 ${statusColors[artwork.availability]}`}>
                      {artwork.availability}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(artwork)} className="text-art-muted hover:text-art-charcoal transition-colors p-2" aria-label="Edit">
                        <Edit2 size={14} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => handleDelete(artwork.id)} className="text-art-muted hover:text-red-500 transition-colors p-2" aria-label="Delete">
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

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">
                Orders ({orders.length})
              </h2>
              <button onClick={fetchOrders} className="text-art-muted hover:text-art-charcoal transition-colors p-1.5" aria-label="Refresh">
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>

            {!supabaseConfigured ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">Connect Supabase to view orders.</p>
              </div>
            ) : ordersLoading ? <PageLoader /> : orders.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">No orders yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="border border-art-pale p-5 md:p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-base text-art-charcoal">{order.customer_name}</p>
                        <a href={`mailto:${order.customer_email}`}
                          className="font-sans text-xs text-art-muted hover:text-art-charcoal transition-colors mt-0.5 block">
                          {order.customer_email}
                        </a>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <span className={`font-sans text-[10px] tracking-widest uppercase px-3 py-1 ${statusColors[order.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                          {order.payment_status}
                        </span>
                        <p className="font-sans text-sm font-medium text-art-charcoal">{formatPrice(order.total)}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {(order.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between font-sans text-xs text-art-muted">
                          <span>{item.artwork_title} × {item.quantity}</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-art-pale">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-sans text-[9px] tracking-widest uppercase text-art-muted">Progress</p>
                        <select
                          value={order.fulfillment_status || 'processing'}
                          onChange={e => updateOrderFulfillment(order.id, e.target.value)}
                          className={`font-sans text-[10px] tracking-widest uppercase px-3 py-1.5 border border-transparent rounded-sm cursor-pointer focus:outline-none appearance-none ${statusColors[order.fulfillment_status || 'processing']}`}
                        >
                          <option value="processing">Processing</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="preparing">Preparing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="font-sans text-xs text-art-muted">
                          {[order.customer_address?.line1, order.customer_address?.city, order.customer_address?.postal_code, order.customer_address?.country].filter(Boolean).join(', ')}
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

        {/* ── COMMISSIONS TAB ── */}
        {tab === 'commissions' && (
          <div>
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">
                Commissions ({commissions.length})
              </h2>
              <button onClick={fetchCommissions} className="text-art-muted hover:text-art-charcoal transition-colors p-1.5" aria-label="Refresh">
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>

            {!supabaseConfigured ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">Connect Supabase to view commission inquiries.</p>
              </div>
            ) : commissionsLoading ? <PageLoader /> : commissions.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">No inquiries yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {commissions.map(c => (
                  <div key={c.id} className="border border-art-pale p-5 md:p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-base text-art-charcoal">{c.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <a href={`mailto:${c.email}`}
                            className="font-sans text-xs text-art-muted hover:text-art-charcoal transition-colors">
                            {c.email}
                          </a>
                          {c.phone && (
                            <>
                              <span className="text-art-light">·</span>
                              <a href={`tel:${c.phone}`}
                                className="font-sans text-xs text-art-muted hover:text-art-charcoal transition-colors">
                                {c.phone}
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <select
                          value={c.status}
                          onChange={e => updateCommissionStatus(c.id, e.target.value)}
                          className={`font-sans text-[10px] tracking-widest uppercase px-3 py-1.5 border border-transparent rounded-sm cursor-pointer focus:outline-none appearance-none ${statusColors[c.status]}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="accepted">Accepted</option>
                          <option value="declined">Declined</option>
                        </select>
                        <p className="font-sans text-xs text-art-light">{formatDate(c.created_at)}</p>
                      </div>
                    </div>
                    <p className="font-sans text-sm text-art-warm leading-relaxed">{c.project_description}</p>
                    <div className="flex flex-wrap gap-x-8 gap-y-2 pt-3 border-t border-art-pale">
                      {c.size_preferences && (
                        <div className="space-y-0.5">
                          <p className="font-sans text-[9px] tracking-widest uppercase text-art-muted">Size</p>
                          <p className="font-sans text-xs text-art-charcoal">{c.size_preferences}</p>
                        </div>
                      )}
                      {c.color_preferences && (
                        <div className="space-y-0.5">
                          <p className="font-sans text-[9px] tracking-widest uppercase text-art-muted">Colour</p>
                          <p className="font-sans text-xs text-art-charcoal">{c.color_preferences}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === 'analytics' && (
          <div>
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">Analytics</h2>
              <button onClick={fetchAnalytics} className="text-art-muted hover:text-art-charcoal transition-colors p-1.5" aria-label="Refresh">
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>

            {!supabaseConfigured ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">Connect Supabase to view analytics.</p>
              </div>
            ) : analyticsLoading ? <PageLoader /> : !analytics ? null : (
              <div className="space-y-10">
                {/* Key metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Revenue', value: formatPrice(analytics.totalRevenue), icon: <TrendingUp size={16} strokeWidth={1.5} /> },
                    { label: 'Total Orders', value: String(analytics.totalOrders), icon: <Package size={16} strokeWidth={1.5} /> },
                    { label: 'Available Works', value: String(analytics.artworkCounts.available), icon: <Eye size={16} strokeWidth={1.5} /> },
                    { label: 'Pending Commissions', value: String(analytics.commissionCounts.pending), icon: <MessageSquare size={16} strokeWidth={1.5} /> },
                  ].map(stat => (
                    <div key={stat.label} className="border border-art-pale p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-sans text-[9px] tracking-widest uppercase text-art-muted">{stat.label}</p>
                        <span className="text-art-light">{stat.icon}</span>
                      </div>
                      <p className="font-serif text-2xl md:text-3xl font-light text-art-charcoal">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Breakdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Artworks */}
                  <div className="border border-art-pale p-6 space-y-5">
                    <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Artworks ({analytics.artworkCounts.total})</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Available', count: analytics.artworkCounts.available, color: 'bg-green-400' },
                        { label: 'Reserved',  count: analytics.artworkCounts.reserved,  color: 'bg-yellow-400' },
                        { label: 'Sold',      count: analytics.artworkCounts.sold,      color: 'bg-red-400' },
                      ].map(({ label, count, color }) => {
                        const pct = analytics.artworkCounts.total > 0
                          ? Math.round((count / analytics.artworkCounts.total) * 100)
                          : 0;
                        return (
                          <div key={label} className="space-y-1">
                            <div className="flex justify-between">
                              <span className="font-sans text-xs text-art-warm">{label}</span>
                              <span className="font-sans text-xs text-art-charcoal">{count}</span>
                            </div>
                            <div className="h-1 bg-art-pale rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Commissions */}
                  <div className="border border-art-pale p-6 space-y-5">
                    <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Commissions ({analytics.commissionCounts.total})</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Pending',  count: analytics.commissionCounts.pending,  color: 'bg-yellow-400' },
                        { label: 'Accepted', count: analytics.commissionCounts.accepted, color: 'bg-green-400' },
                        { label: 'Declined', count: analytics.commissionCounts.declined, color: 'bg-red-400' },
                      ].map(({ label, count, color }) => {
                        const pct = analytics.commissionCounts.total > 0
                          ? Math.round((count / analytics.commissionCounts.total) * 100)
                          : 0;
                        return (
                          <div key={label} className="space-y-1">
                            <div className="flex justify-between">
                              <span className="font-sans text-xs text-art-warm">{label}</span>
                              <span className="font-sans text-xs text-art-charcoal">{count}</span>
                            </div>
                            <div className="h-1 bg-art-pale rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent orders */}
                {analytics.recentOrders.length > 0 && (
                  <div className="border border-art-pale p-6 space-y-4">
                    <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted">Recent Orders</p>
                    <div className="divide-y divide-art-pale">
                      {analytics.recentOrders.map(order => (
                        <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                          <div className="min-w-0">
                            <p className="font-serif text-sm text-art-charcoal">{order.customer_name}</p>
                            <p className="font-sans text-xs text-art-muted truncate">
                              {(order.items || []).map(i => i.artwork_title).join(', ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`font-sans text-[9px] tracking-widest uppercase px-2 py-0.5 ${statusColors[order.fulfillment_status || 'processing']}`}>
                              {order.fulfillment_status || 'processing'}
                            </span>
                            <span className="font-sans text-sm text-art-charcoal">{formatPrice(order.total)}</span>
                            <span className="font-sans text-xs text-art-light hidden sm:block">{formatDate(order.created_at)}</span>
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
