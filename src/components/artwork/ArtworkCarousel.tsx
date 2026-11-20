import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useArtworks } from '../../hooks/useArtworks';

const controlClass = 'inline-flex size-11 items-center justify-center rounded-full border border-art-light text-art-charcoal hover:bg-cream-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

export function ArtworkCarousel() {
  const { artworks, loading, error } = useArtworks();
  const selection = artworks.filter(artwork => artwork.images?.[0]).slice(0, 6);
  const [index, setIndex] = useState(0);
  const activeIndex = selection.length ? index % selection.length : 0;
  const artwork = selection[activeIndex];

  function move(direction: number) {
    setIndex(current => (current + direction + selection.length) % selection.length);
  }

  return (
    <section aria-labelledby="about-gallery" className="bg-cream-100 px-6 py-16 md:px-12 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 id="about-gallery" className="mb-8 font-serif text-4xl font-light text-art-charcoal md:text-5xl">
          Gallery
        </h2>
        {artwork ? (
          <div aria-roledescription="carousel" role="group" aria-label="Selected artworks">
            <div aria-live="polite" aria-atomic="true">
              <Link to={`/artwork/${artwork.id}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                <img
                  src={artwork.images[0]}
                  alt=""
                  loading="lazy"
                  className="h-[min(65vw,28rem)] w-full bg-cream-200 object-contain"
                />
                <span className="mt-4 block font-serif text-2xl text-art-charcoal">
                  {artwork.title}
                </span>
              </Link>
            </div>
            {selection.length > 1 && (
              <div className="mt-5 flex items-center gap-4">
                <button type="button" onClick={() => move(-1)} aria-label="Previous artwork" className={controlClass}>
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <span className="text-xs tabular-nums text-art-warm">
                  {activeIndex + 1} / {selection.length}
                </span>
                <button type="button" onClick={() => move(1)} aria-label="Next artwork" className={controlClass}>
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <p role="status" className="text-sm text-art-warm">
            {loading ? 'Loading artworks…' : error ? 'Artworks are temporarily unavailable.' : 'No artworks to show yet.'}
          </p>
        )}
        <Link to="/gallery" className="mt-8 inline-block border-b border-art-light pb-0.5 text-[11px] uppercase tracking-widest text-art-warm hover:text-art-charcoal">
          View All Works
        </Link>
      </div>
    </section>
  );
}
