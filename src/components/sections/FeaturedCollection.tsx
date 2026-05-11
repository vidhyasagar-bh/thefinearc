import { Link } from 'react-router-dom';
import { FadeIn } from '../ui/FadeIn';
import { ArtworkCard } from '../artwork/ArtworkCard';
import { mockArtworks } from '../../lib/mockData';

export function FeaturedCollection() {
  const featured = mockArtworks.filter(a => a.availability === 'available').slice(0, 3);

  return (
    <section className="py-28 md:py-40 px-6 md:px-12 lg:px-20 bg-art-white">
      <div className="max-w-8xl mx-auto">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
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
