import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn } from '../ui/FadeIn';
import { ArtworkCard } from '../artwork/ArtworkCard';
import { mockArtworks } from '../../lib/mockData';

export function FeaturedCollection() {
  const featured = mockArtworks.filter(a => a.availability === 'available').slice(0, 3);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = useCallback((dir: number) => {
    setDirection(dir);
    setIndex(i => (i + dir + featured.length) % featured.length);
  }, [featured.length]);

  // Autoscroll every 5 seconds
  useEffect(() => {
    const t = setInterval(() => go(1), 5000);
    return () => clearInterval(t);
  }, [go]);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
  };

  return (
    <section className="py-20 md:py-40 bg-art-white">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-16 gap-4 px-6 md:px-12 lg:px-20">
            <h2 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal">
              Current Collection
            </h2>
            <Link
              to="/gallery"
              className="font-sans text-[11px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors border-b border-art-light hover:border-art-charcoal pb-0.5 self-start md:self-auto"
            >
              View All Works
            </Link>
          </div>
        </FadeIn>

        {/* Mobile carousel — one card at a time */}
        <div className="md:hidden px-6">
          <div className="relative">
            {/* Card */}
            <div className="overflow-hidden">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={index}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ArtworkCard artwork={featured[index]} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Arrows overlaid on the image — absolutely pinned to each edge, centered on image height */}
            <div className="absolute top-0 inset-x-0 aspect-[3/4] pointer-events-none">
              <button
                onClick={() => go(-1)}
                aria-label="Previous"
                className="pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors drop-shadow"
              >
                <ChevronLeft size={28} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Next"
                className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors drop-shadow"
              >
                <ChevronRight size={28} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                className={`rounded-full transition-all duration-300 ${
                  i === index ? 'w-5 h-1.5 bg-art-charcoal' : 'w-1.5 h-1.5 bg-art-light'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
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
