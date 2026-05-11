import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Eye, Package, MessageSquare, Users } from 'lucide-react';
import { FadeIn } from '../components/ui/FadeIn';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { useArtworks } from '../hooks/useArtworks';
import { mockArtworks } from '../lib/mockData';
import type { Artwork, ArtworkCategory } from '../types';
import { formatPrice } from '../utils/format';
import toast from 'react-hot-toast';
import { supabase, supabaseConfigured } from '../lib/supabase';

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

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('artworks');
  const { artworks } = useArtworks();
  const displayArtworks = !supabaseConfigured ? mockArtworks : artworks;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyArtwork);

  function update(field: string, value: string) {
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
          await supabase.from('artworks').update(data).eq('id', editingId);
        } else {
          await supabase.from('artworks').insert(data);
        }
      }
      toast.success(editingId ? 'Artwork updated.' : 'Artwork added.');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyArtwork);
    } catch {
      toast.error('Failed to save. Please try again.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this artwork?')) return;
    try {
      if (supabaseConfigured) {
        await supabase.from('artworks').delete().eq('id', id);
      }
      toast.success('Artwork deleted.');
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
  }

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'artworks', label: 'Artworks', icon: <Eye size={14} strokeWidth={1.5} /> },
    { key: 'orders', label: 'Orders', icon: <Package size={14} strokeWidth={1.5} /> },
    { key: 'commissions', label: 'Commissions', icon: <MessageSquare size={14} strokeWidth={1.5} /> },
    { key: 'subscribers', label: 'Subscribers', icon: <Users size={14} strokeWidth={1.5} /> },
  ];

  return (
    <div className="min-h-screen bg-art-white">
      {/* Top bar */}
      <div className="border-b border-art-pale sticky top-0 bg-art-white z-40">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between h-16">
          <p className="font-serif text-xl font-light text-art-charcoal">The Fine Arc · Admin</p>
          <a href="/" className="font-sans text-[10px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors">
            View Site
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10">
        {/* Tabs */}
        <div className="flex gap-1 mb-10 border-b border-art-pale">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 font-sans text-[10px] tracking-widest uppercase px-4 py-3 border-b-2 -mb-px transition-all duration-300 ${
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

        {/* Artworks tab */}
        {tab === 'artworks' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-2xl font-light text-art-charcoal">
                Artworks ({displayArtworks.length})
              </h2>
              <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyArtwork); }}>
                <Plus size={14} strokeWidth={1.5} /> Add Artwork
              </Button>
            </div>

            {/* Artwork form */}
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 p-8 border border-art-pale bg-cream-50 space-y-7"
              >
                <h3 className="font-serif text-xl font-light text-art-charcoal">
                  {editingId ? 'Edit Artwork' : 'New Artwork'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                  <Input label="Title *" value={form.title} onChange={e => update('title', e.target.value)} />
                  <Input label="Price (USD) *" type="number" value={form.price} onChange={e => update('price', e.target.value)} />
                  <Input label="Dimensions" value={form.dimensions} onChange={e => update('dimensions', e.target.value)} placeholder="e.g. 80 × 100 cm" />
                  <Input label="Materials" value={form.materials} onChange={e => update('materials', e.target.value)} />
                  <Input label="Year" value={form.year} onChange={e => update('year', e.target.value)} />
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-art-muted mb-2 font-sans">Category</label>
                    <select
                      value={form.category}
                      onChange={e => update('category', e.target.value)}
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
                      onChange={e => update('availability', e.target.value as any)}
                      className="w-full bg-transparent border-b border-art-light text-art-charcoal font-sans text-sm py-3 focus:outline-none focus:border-art-charcoal"
                    >
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="reserved">Reserved</option>
                    </select>
                  </div>
                  <Input label="Framing" value={form.framing} onChange={e => update('framing', e.target.value)} />
                </div>
                <Input
                  label="Image URL (primary)"
                  value={form.images[0]}
                  onChange={e => setForm(p => ({ ...p, images: [e.target.value, ...p.images.slice(1)] }))}
                  placeholder="https://..."
                />
                <Textarea label="Description" value={form.description} onChange={e => update('description', e.target.value)} />
                <Textarea label="Story (italic quote)" value={form.story} onChange={e => update('story', e.target.value)} />

                <div className="flex gap-4 pt-2">
                  <Button onClick={handleSave}>{editingId ? 'Save Changes' : 'Add Artwork'}</Button>
                  <Button variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
                </div>
                {!supabaseConfigured && (
                  <p className="font-sans text-xs text-art-muted">⚠ Running in demo mode. Connect Supabase to persist changes.</p>
                )}
              </motion.div>
            )}

            {/* Artwork list */}
            <div className="divide-y divide-art-pale">
              {displayArtworks.map(artwork => (
                <FadeIn key={artwork.id}>
                  <div className="flex items-center gap-6 py-5">
                    <div className="w-14 h-14 shrink-0 overflow-hidden bg-cream-100">
                      <img src={artwork.images[0]} alt={artwork.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-base text-art-charcoal truncate">{artwork.title}</p>
                      <p className="font-sans text-xs text-art-muted">{artwork.category} · {artwork.dimensions}</p>
                    </div>
                    <p className="font-sans text-sm text-art-charcoal hidden md:block">{formatPrice(artwork.price)}</p>
                    <span className={`font-sans text-[10px] tracking-widest uppercase px-3 py-1 hidden md:block ${
                      artwork.availability === 'available' ? 'bg-green-50 text-green-700' :
                      artwork.availability === 'sold' ? 'bg-red-50 text-red-600' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>
                      {artwork.availability}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => startEdit(artwork)}
                        className="text-art-muted hover:text-art-charcoal transition-colors"
                      >
                        <Edit2 size={14} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDelete(artwork.id)}
                        className="text-art-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl font-light text-art-muted">
              {!supabaseConfigured ? 'Connect Supabase to view orders.' : 'No orders yet.'}
            </p>
          </div>
        )}

        {/* Commissions tab */}
        {tab === 'commissions' && (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl font-light text-art-muted">
              {!supabaseConfigured ? 'Connect Supabase to view commission inquiries.' : 'No inquiries yet.'}
            </p>
          </div>
        )}

        {/* Subscribers tab */}
        {tab === 'subscribers' && (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl font-light text-art-muted">
              {!supabaseConfigured ? 'Connect Supabase to view subscribers.' : 'No subscribers yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
