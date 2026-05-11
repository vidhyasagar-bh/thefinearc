import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '../components/layout/Layout';
import { ArtworkGrid } from '../components/artwork/ArtworkGrid';
import { FadeIn } from '../components/ui/FadeIn';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useArtworks } from '../hooks/useArtworks';
import type { ArtworkCategory } from '../types';

const categories: { label: string; value: ArtworkCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Painting', value: 'painting' },
  { label: 'Drawing', value: 'drawing' },
  { label: 'Photography', value: 'photography' },
  { label: 'Print', value: 'print' },
  { label: 'Mixed Media', value: 'mixed-media' },
];

export function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState<ArtworkCategory | 'all'>('all');
  const { artworks, loading } = useArtworks(
    activeCategory === 'all' ? undefined : activeCategory
  );

  return (
    <Layout>
      {/* Header */}
      <div className="pt-32 md:pt-40 pb-12 md:pb-20 px-6 md:px-12 lg:px-20 bg-art-white">
        <div className="max-w-8xl mx-auto">
          <FadeIn>
            <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-4">
              Works Available
            </p>
            <h1 className="font-serif text-5xl md:text-6xl font-light text-art-charcoal">
              Gallery
            </h1>
            <p className="mt-4 font-sans text-sm text-art-muted max-w-md leading-relaxed">
              Each work is an original — painted, drawn, or captured once, and offered as a singular object.
            </p>
          </FadeIn>

          {/* Filter */}
          <FadeIn delay={0.2}>
            <div className="flex flex-wrap gap-1 mt-12">
              {categories.map(cat => (
                <motion.button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  whileTap={{ scale: 0.98 }}
                  className={`font-sans text-[10px] tracking-widest uppercase px-5 py-2.5 border transition-all duration-300 ${
                    activeCategory === cat.value
                      ? 'bg-art-charcoal text-art-white border-art-charcoal'
                      : 'bg-transparent text-art-muted border-art-pale hover:border-art-light hover:text-art-charcoal'
                  }`}
                >
                  {cat.label}
                </motion.button>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Grid */}
      <div className="pb-28 md:pb-40 px-6 md:px-12 lg:px-20">
        <div className="max-w-8xl mx-auto">
          {loading ? (
            <PageLoader />
          ) : artworks.length === 0 ? (
            <div className="py-32 text-center">
              <p className="font-serif text-2xl font-light text-art-muted">No works found</p>
            </div>
          ) : (
            <ArtworkGrid artworks={artworks} />
          )}
        </div>
      </div>
    </Layout>
  );
}
