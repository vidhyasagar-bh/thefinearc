import { useState, useEffect } from 'react';
import type { Artwork, ArtworkCategory } from '../types';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { mockArtworks } from '../lib/mockData';

export function useArtworks(category?: ArtworkCategory) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      if (!supabaseConfigured) {
        const filtered = category
          ? mockArtworks.filter(a => a.category === category)
          : mockArtworks;
        setArtworks(filtered);
        setLoading(false);
        return;
      }
      let query = supabase.from('artworks').select('*').order('created_at', { ascending: false });
      if (category) query = query.eq('category', category);
      const { data, error: err } = await query;
      if (err) setError(err.message);
      else setArtworks((data as Artwork[]) || []);
      setLoading(false);
    }
    fetch();
  }, [category]);

  return { artworks, loading, error };
}

export function useArtwork(id: string) {
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      if (!supabaseConfigured) {
        const found = mockArtworks.find(a => a.id === id) || null;
        setArtwork(found);
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from('artworks')
        .select('*')
        .eq('id', id)
        .single();
      if (err) setError(err.message);
      else setArtwork(data as Artwork);
      setLoading(false);
    }
    fetch();
  }, [id]);

  return { artwork, loading, error };
}
