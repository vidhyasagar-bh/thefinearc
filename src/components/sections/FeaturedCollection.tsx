import { Link } from 'react-router-dom';
import { FadeIn } from '../ui/FadeIn';
import { ArtworkCard } from '../artwork/ArtworkCard';
import { mockArtworks } from '../../lib/mockData';

export function FeaturedCollection() {
  const featured = mockArtworks.filter(a => a.availability === 'available').slice(0, 3);

  return (
    <section className="py-28 md:py-40 bg-art-white">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-6 px-6 md:px-12 lg:px-20">
            <div>
              <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted mb-4">
                New Work
              </p>
              <h2 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal">
                Current Collection
              </h2>
            </div>
            <Link
              to="/gallery"
              className="font-sans text-[11px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors border-b border-art-light hover:border-art-charcoal pb-0.5 self-start md:self-auto"
            >
              View All Works
            </Link>
          </div>
        </FadeIn>

        {/* Mobile carousel */}
        <div className="md:hidden">
          <div className="flex gap-5 overflow-x-auto px-6 pb-8 snap-x snap-mandatory scrollbar-hide">
            {featured.map((artwork, i) => (
              <div
                key={artwork.id}
                className="flex-none w-[72vw] snap-start"
              >
                <ArtworkCard artwork={artwork} index={i} />
              </div>
            ))}
            {/* Trailing space so last card doesn't touch edge */}
            <div className="flex-none w-6" />
          </div>
          {/* Scroll hint dots */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {featured.map((_, i) => (
              <div key={i} className={`rounded-full bg-art-light ${i === 0 ? 'w-4 h-1' : 'w-1 h-1'}`} />
            ))}
          </div>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14 px-12 lg:px-20">
          {featured.map((artwork, i) => (
            <FadeIn key={artwork.id} delay={i * 0.12}>
              <ArtworkCard artwork={artwork} index={i} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
