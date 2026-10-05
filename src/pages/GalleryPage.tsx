import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/layout/Layout';
import { ArtworkGrid } from '../components/artwork/ArtworkGrid';
import { FadeIn } from '../components/ui/FadeIn';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useArtworks } from '../hooks/useArtworks';
import { sectionLabel } from '../utils/sections';

export function GalleryPage() {
  const [params, setParams] = useSearchParams();
  const { artworks: all, loading } = useArtworks();

  // Sections come from the listings themselves, so a new section appears as soon as one listing uses it
  const categories = useMemo(() => {
    const slugs = Array.from(new Set(all.map(a => a.category).filter(Boolean))).sort();
    return [
      { label: 'All', value: 'all' },
      ...slugs.map(slug => ({ label: sectionLabel(slug), value: slug })),
    ];
  }, [all]);

  const requested = params.get('section') ?? 'all';
  const activeCategory = categories.some(c => c.value === requested) ? requested : 'all';
  const artworks = activeCategory === 'all' ? all : all.filter(a => a.category === activeCategory);

  function setActiveCategory(value: string) {
    setParams(value === 'all' ? {} : { section: value }, { replace: true });
  }

  return (
    <Layout>
      {/* Header */}
      <div className="pt-28 md:pt-40 pb-10 md:pb-20 px-6 md:px-12 lg:px-20 bg-art-white">
        <div className="max-w-8xl mx-auto">
          <FadeIn>
            <h1 className="font-serif text-4xl md:text-6xl font-light text-art-charcoal">
              Gallery
            </h1>
            <p className="mt-3 font-sans text-sm text-art-muted max-w-md leading-relaxed">
              Each work is an original — painted, drawn, or captured once, and offered as a singular object.
            </p>
          </FadeIn>

          {/* Filter — horizontal scroll on mobile */}
          <FadeIn delay={0.15}>
            <div className="flex gap-1.5 mt-8 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <motion.button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-none font-sans text-[10px] tracking-widest uppercase px-4 py-2.5 border transition-all duration-300 ${
                    activeCategory === cat.value
                      ? 'bg-art-charcoal text-white border-art-charcoal'
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
      <div className="pb-20 md:pb-40 px-6 md:px-12 lg:px-20">
        <div className="max-w-8xl mx-auto">
          {loading ? (
            <PageLoader />
          ) : artworks.length === 0 ? (
            <div className="py-24 text-center">
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
