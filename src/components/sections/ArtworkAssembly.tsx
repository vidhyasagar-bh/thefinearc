import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useArtworks } from '../../hooks/useArtworks';
import { formatPrice } from '../../utils/format';
import type { Artwork } from '../../types';

const STAGES = [
  { label: 'Observation', body: 'Every work begins long before the first mark — in hours of looking, sitting with a subject until it stops being an object.' },
  { label: 'First marks',  body: 'The initial layer is always wrong. It is a necessary wrong — a commitment that forces every decision that follows.' },
  { label: 'Building',     body: 'Colour, tone, texture. Each layer added slowly, often sanded back. The surface accumulates time.' },
  { label: 'Completion',   body: 'A painting is finished not when nothing can be added, but when nothing needs to be.' },
];

// Delay (ms) before each layer appears after section enters view
const LAYER_DELAYS = [0, 1200, 2400, 3600];

function AssemblyScene({ artwork }: { artwork: Artwork }) {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const [started, setStarted]     = useState(false);
  const [layerCount, setLayerCount] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  // Start the animation once the section enters the viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Each layer appears on its own timer after start
  useEffect(() => {
    if (!started) return;
    const timers = LAYER_DELAYS.map((delay, i) =>
      setTimeout(() => {
        setLayerCount(i + 1);
        setStageIndex(i);
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [started]);

  const imageUrl = artwork.images[0];

  return (
    <section ref={sectionRef} className="bg-art-charcoal py-24 md:py-32 px-6 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20">

      {/* Process text — left */}
      <div className="w-full max-w-[200px] shrink-0">
        <p className="font-sans text-[9px] tracking-widest uppercase text-white/20 mb-8">The Process</p>
        <div className="relative h-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={stageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col justify-center"
            >
              <p className="font-sans text-[9px] tracking-widest uppercase text-white/35 mb-3">
                {STAGES[stageIndex].label}
              </p>
              <p className="font-sans text-sm text-white/55 leading-relaxed">
                {STAGES[stageIndex].body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Painting — layers stack on top of each other */}
      <div
        className="relative shrink-0"
        style={{ width: 'min(55vw, 320px)', height: 'min(73vw, 427px)' }}
      >
        {[0.15, 0.25, 0.30, 0.30].map((targetOpacity, i) => (
          layerCount > i ? (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: targetOpacity }}
              transition={{ duration: 0.9, ease: 'easeIn' }}
              style={{
                position: 'absolute', inset: 0,
                backgroundImage:    `url(${imageUrl})`,
                backgroundSize:     'cover',
                backgroundPosition: 'center',
              }}
            />
          ) : null
        ))}
      </div>

      {/* Artwork info — fades in when all layers done */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={layerCount >= 4 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="text-center md:text-right w-full max-w-[200px] shrink-0"
      >
        <p className="font-sans text-[9px] tracking-widest uppercase text-white/35 mb-2">
          {[artwork.category, artwork.year].filter(Boolean).join(' · ')}
        </p>
        <h2 className="font-serif text-xl md:text-2xl font-light text-white leading-tight mb-2">
          {artwork.title}
        </h2>
        {artwork.materials && (
          <p className="font-sans text-[11px] text-white/40 mb-5">{artwork.materials}</p>
        )}
        <div className="flex items-center justify-center md:justify-end gap-4">
          <span className="font-serif text-base text-white/80">{formatPrice(artwork.price)}</span>
          {artwork.availability === 'available' && (
            <Link
              to={`/artwork/${artwork.id}`}
              className="font-sans text-[10px] tracking-widest uppercase text-white/50 hover:text-white border-b border-white/20 hover:border-white/60 pb-0.5 transition-colors duration-300"
            >
              View Work
            </Link>
          )}
        </div>
      </motion.div>

    </section>
  );
}

export function ArtworkAssembly() {
  const { artworks, loading } = useArtworks();
  const featured = artworks.find(a => a.availability === 'available') ?? artworks[0];

  if (loading || !featured) return null;

  return <AssemblyScene artwork={featured} />;
}
