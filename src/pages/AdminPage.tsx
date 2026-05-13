import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Eye, Package, MessageSquare, Users, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { PageLoader } from '../components/ui/LoadingSpinner';
import type { Artwork, ArtworkCategory, CommissionInquiry, NewsletterSubscriber } from '../types';
import { formatPrice, formatDate } from '../utils/format';
import toast from 'react-hot-toast';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { mockArtworks } from '../lib/mockData';

type AdminTab = 'artworks' | 'orders' | 'commissions' | 'subscribers';

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
  created_at: string;
}

const emptyArtwork: ArtworkFormState = {
  title: '',
  description: '',
  story: '',
  price: '',
  dimensions: '',
  materials: '',
  category: 'painting',
  images: [''],
  availability: 'available',
  framing: '',
  year: new Date().getFullYear().toString(),
};

const statusColors: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700',
  reviewed:  'bg-blue-50 text-blue-700',
  accepted:  'bg-green-50 text-green-700',
  declined:  'bg-red-50 text-red-600',
  paid:      'bg-green-50 text-green-700',
  failed:    'bg-red-50 text-red-600',
  refunded:  'bg-gray-100 text-gray-600',
  available: 'bg-green-50 text-green-700',
  sold:      'bg-red-50 text-red-600',
  reserved:  'bg-yellow-50 text-yellow-700',
};

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('artworks');

  // — Artworks —
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artworksLoading, setArtworksLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyArtwork);

  // — Orders —
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // — Commissions —
  const [commissions, setCommissions] = useState<CommissionInquiry[]>([]);
  const [commissionsLoading, setCommissionsLoading] = useState(false);

  // — Subscribers —
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);

  // Fetch artworks
  const fetchArtworks = useCallback(async () => {
    setArtworksLoading(true);
    if (!supabaseConfigured) {
      setArtworks(mockArtworks);
      setArtworksLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load artworks.');
    else setArtworks((data as Artwork[]) || []);
    setArtworksLoading(false);
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!supabaseConfigured) return;
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load orders.');
    else setOrders((data as Order[]) || []);
    setOrdersLoading(false);
  }, []);

  // Fetch commissions
  const fetchCommissions = useCallback(async () => {
    if (!supabaseConfigured) return;
    setCommissionsLoading(true);
    const { data, error } = await supabase
      .from('commission_inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load commissions.');
    else setCommissions((data as CommissionInquiry[]) || []);
    setCommissionsLoading(false);
  }, []);

  // Fetch subscribers
  const fetchSubscribers = useCallback(async () => {
    if (!supabaseConfigured) return;
    setSubscribersLoading(true);
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load subscribers.');
    else setSubscribers((data as NewsletterSubscriber[]) || []);
    setSubscribersLoading(false);
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (tab === 'artworks') fetchArtworks();
    if (tab === 'orders') fetchOrders();
    if (tab === 'commissions') fetchCommissions();
    if (tab === 'subscribers') fetchSubscribers();
  }, [tab, fetchArtworks, fetchOrders, fetchCommissions, fetchSubscribers]);

  function updateForm(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.title || !form.price) {
      toast.error('Title and price are required.');
      return;
    }
    try {
      const data = {
        title: form.title,
        description: form.description,
        story: form.story || null,
        price: parseFloat(form.price),
        dimensions: form.dimensions,
        materials: form.materials,
        category: form.category,
        images: form.images.filter(Boolean),
        availability: form.availability,
        framing: form.framing || null,
        year: parseInt(form.year) || null,
      };
      if (supabaseConfigured) {
        if (editingId) {
          const { error } = await supabase.from('artworks').update(data).eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('artworks').insert(data);
          if (error) throw error;
        }
      }
      toast.success(editingId ? 'Artwork updated.' : 'Artwork added.');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyArtwork);
      fetchArtworks();
    } catch {
      toast.error('Failed to save. Please try again.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this artwork? This cannot be undone.')) return;
    try {
      if (supabaseConfigured) {
        const { error } = await supabase.from('artworks').delete().eq('id', id);
        if (error) throw error;
      }
      toast.success('Artwork deleted.');
      setArtworks(prev => prev.filter(a => a.id !== id));
    } catch {
      toast.error('Failed to delete.');
    }
  }

  function startEdit(artwork: Artwork) {
    setForm({
      title: artwork.title,
      description: artwork.description,
      story: artwork.story || '',
      price: artwork.price.toString(),
      dimensions: artwork.dimensions,
      materials: artwork.materials,
      category: artwork.category,
      images: artwork.images.length ? artwork.images : [''],
      availability: artwork.availability,
      framing: artwork.framing || '',
      year: artwork.year?.toString() || '',
    });
    setEditingId(artwork.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function updateCommissionStatus(id: string, status: string) {
    if (!supabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('commission_inquiries')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      setCommissions(prev =>
        prev.map(c => c.id === id ? { ...c, status: status as CommissionInquiry['status'] } : c)
      );
      toast.success('Status updated.');
    } catch {
      toast.error('Failed to update status.');
    }
  }

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'artworks',    label: 'Artworks',    icon: <Eye size={14} strokeWidth={1.5} /> },
    { key: 'orders',      label: 'Orders',      icon: <Package size={14} strokeWidth={1.5} /> },
    { key: 'commissions', label: 'Commissions', icon: <MessageSquare size={14} strokeWidth={1.5} /> },
    { key: 'subscribers', label: 'Subscribers', icon: <Users size={14} strokeWidth={1.5} /> },
  ];

  return (
    <div className="min-h-screen bg-art-white">
      {/* Top bar */}
      <div className="border-b border-art-pale sticky top-0 bg-art-white z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-10 flex items-center justify-between h-14 md:h-16">
          <p className="font-serif text-base md:text-xl font-light text-art-charcoal">Fine Arc · Admin</p>
          <a href="/" className="font-sans text-[10px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors">
            View Site
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-10">
        {/* Tabs */}
        <div className="flex mb-8 md:mb-10 border-b border-art-pale">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 font-sans text-[10px] tracking-widest uppercase px-3 md:px-4 py-3 border-b-2 -mb-px transition-all duration-300 flex-1 md:flex-none justify-center md:justify-start ${
                tab === t.key
                  ? 'border-art-charcoal text-art-charcoal'
                  : 'border-transparent text-art-muted hover:text-art-charcoal'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
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
                <button onClick={fetchArtworks} className="text-art-muted hover:text-art-charcoal transition-colors p-1" aria-label="Refresh">
                  <RefreshCw size={14} strokeWidth={1.5} />
                </button>
                <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyArtwork); }}>
                  <Plus size={14} strokeWidth={1.5} />
                  <span className="hidden sm:inline">Add Artwork</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            {/* Artwork form */}
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
                    <select
                      value={form.category}
                      onChange={e => updateForm('category', e.target.value)}
                      className="w-full bg-transparent border-b border-art-light text-art-charcoal font-sans text-sm py-3 focus:outline-none focus:border-art-charcoal"
                    >
                      {['painting','drawing','print','photography','mixed-media','sculpture'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-art-muted mb-2 font-sans">Availability</label>
                    <select
                      value={form.availability}
                      onChange={e => updateForm('availability', e.target.value)}
                      className="w-full bg-transparent border-b border-art-light text-art-charcoal font-sans text-sm py-3 focus:outline-none focus:border-art-charcoal"
                    >
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
                  onChange={e => setForm(p => ({ ...p, images: [e.target.value, ...p.images.slice(1)] }))}
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

            {/* Artwork list */}
            {artworksLoading ? (
              <PageLoader />
            ) : (
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
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => startEdit(artwork)} className="text-art-muted hover:text-art-charcoal transition-colors p-1.5" aria-label="Edit">
                        <Edit2 size={14} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => handleDelete(artwork.id)} className="text-art-muted hover:text-red-500 transition-colors p-1.5" aria-label="Delete">
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
              <button onClick={fetchOrders} className="text-art-muted hover:text-art-charcoal transition-colors p-1" aria-label="Refresh">
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>

            {!supabaseConfigured ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">Connect Supabase to view orders.</p>
              </div>
            ) : ordersLoading ? (
              <PageLoader />
            ) : orders.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">No orders yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="border border-art-pale p-5 md:p-6 space-y-4">
                    {/* Order header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-base text-art-charcoal">{order.customer_name}</p>
                        <p className="font-sans text-xs text-art-muted mt-0.5">{order.customer_email}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-sans text-[10px] tracking-widest uppercase px-3 py-1 ${statusColors[order.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                          {order.payment_status}
                        </span>
                        <p className="font-sans text-sm font-medium text-art-charcoal">{formatPrice(order.total)}</p>
                      </div>
                    </div>
                    {/* Items */}
                    <div className="space-y-1.5">
                      {(order.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between font-sans text-xs text-art-muted">
                          <span>{item.artwork_title} × {item.quantity}</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    {/* Address + date */}
                    <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-art-pale">
                      <p className="font-sans text-xs text-art-muted">
                        {[order.customer_address?.line1, order.customer_address?.city, order.customer_address?.postal_code, order.customer_address?.country].filter(Boolean).join(', ')}
                      </p>
                      <p className="font-sans text-xs text-art-light">{formatDate(order.created_at)}</p>
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
              <button onClick={fetchCommissions} className="text-art-muted hover:text-art-charcoal transition-colors p-1" aria-label="Refresh">
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>

            {!supabaseConfigured ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">Connect Supabase to view commission inquiries.</p>
              </div>
            ) : commissionsLoading ? (
              <PageLoader />
            ) : commissions.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">No inquiries yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {commissions.map(c => (
                  <div key={c.id} className="border border-art-pale p-5 md:p-6 space-y-4">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-base text-art-charcoal">{c.name}</p>
                        <p className="font-sans text-xs text-art-muted mt-0.5">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <select
                          value={c.status}
                          onChange={e => updateCommissionStatus(c.id, e.target.value)}
                          className={`font-sans text-[10px] tracking-widest uppercase px-3 py-1 border-0 cursor-pointer focus:outline-none ${statusColors[c.status]}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="accepted">Accepted</option>
                          <option value="declined">Declined</option>
                        </select>
                        <p className="font-sans text-xs text-art-light shrink-0">{formatDate(c.created_at)}</p>
                      </div>
                    </div>
                    {/* Description */}
                    <p className="font-sans text-sm text-art-warm leading-relaxed">{c.project_description}</p>
                    {/* Specs */}
                    <div className="flex flex-wrap gap-x-8 gap-y-1.5 pt-2 border-t border-art-pale">
                      {c.size_preferences && (
                        <div>
                          <span className="font-sans text-[9px] tracking-widest uppercase text-art-muted">Size </span>
                          <span className="font-sans text-xs text-art-charcoal">{c.size_preferences}</span>
                        </div>
                      )}
                      {c.color_preferences && (
                        <div>
                          <span className="font-sans text-[9px] tracking-widest uppercase text-art-muted">Colour </span>
                          <span className="font-sans text-xs text-art-charcoal">{c.color_preferences}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SUBSCRIBERS TAB ── */}
        {tab === 'subscribers' && (
          <div>
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="font-serif text-xl md:text-2xl font-light text-art-charcoal">
                Subscribers ({subscribers.length})
              </h2>
              <div className="flex items-center gap-3">
                <button onClick={fetchSubscribers} className="text-art-muted hover:text-art-charcoal transition-colors p-1" aria-label="Refresh">
                  <RefreshCw size={14} strokeWidth={1.5} />
                </button>
                {subscribers.length > 0 && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(subscribers.map(s => s.email).join('\n'));
                      toast.success('Emails copied to clipboard.');
                    }}
                    className="font-sans text-[10px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors border-b border-art-light hover:border-art-charcoal pb-0.5"
                  >
                    Copy all
                  </button>
                )}
              </div>
            </div>

            {!supabaseConfigured ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">Connect Supabase to view subscribers.</p>
              </div>
            ) : subscribersLoading ? (
              <PageLoader />
            ) : subscribers.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-serif text-xl font-light text-art-muted">No subscribers yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-art-pale">
                {subscribers.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-3.5 gap-4">
                    <p className="font-sans text-sm text-art-charcoal truncate">{s.email}</p>
                    <p className="font-sans text-xs text-art-light shrink-0">{formatDate(s.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
