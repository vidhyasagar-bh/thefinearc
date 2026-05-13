import { useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
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

function StageText({ index, stage, progress }: {
  index: number;
  stage: typeof STAGES[number];
  progress: MotionValue<number>;
}) {
  const windows = [
    [0.00, 0.08, 0.22, 0.30],
    [0.22, 0.30, 0.50, 0.58],
    [0.50, 0.58, 0.76, 0.84],
    [0.76, 0.84, 1.00, 1.00],
  ];
  const [s, peak, e, out] = windows[index];
  const opacity = useTransform(progress, [s, peak, e, out], [0, 1, 1, 0]);
  const y       = useTransform(progress, [s, peak], [10, 0]);

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-0 flex flex-col justify-center">
      <p className="font-sans text-[9px] tracking-widest uppercase text-white/35 mb-3">{stage.label}</p>
      <p className="font-sans text-sm text-white/55 leading-relaxed">{stage.body}</p>
    </motion.div>
  );
}

function ArtworkInfo({ artwork, progress }: { artwork: Artwork; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.82, 0.97], [0, 1]);
  const y       = useTransform(progress, [0.82, 0.97], [14, 0]);
  return (
    <motion.div style={{ opacity, y }} className="absolute right-8 md:right-14 top-1/2 -translate-y-1/2 text-right w-[150px] md:w-[200px]">
      <p className="font-sans text-[9px] tracking-widest uppercase text-white/35 mb-2">
        {[artwork.category, artwork.year].filter(Boolean).join(' · ')}
      </p>
      <h2 className="font-serif text-xl md:text-2xl font-light text-white leading-tight mb-2">{artwork.title}</h2>
      {artwork.materials && <p className="font-sans text-[11px] text-white/40 mb-5">{artwork.materials}</p>}
      <div className="flex items-center justify-end gap-4">
        <span className="font-serif text-base text-white/80">{formatPrice(artwork.price)}</span>
        {artwork.availability === 'available' && (
          <Link to={`/artwork/${artwork.id}`}
            className="font-sans text-[10px] tracking-widest uppercase text-white/50 hover:text-white border-b border-white/20 hover:border-white/60 pb-0.5 transition-colors duration-300">
            View Work
          </Link>
        )}
      </div>
    </motion.div>
  );
}

function LayeredPainting({ imageUrl, progress }: { imageUrl: string; progress: MotionValue<number> }) {
  // Layer 2 fades in at progress 0.22–0.52
  const layer2Opacity = useTransform(progress, [0.22, 0.52], [0, 1]);
  // Layer 3 fades in at progress 0.50–0.80
  const layer3Opacity = useTransform(progress, [0.50, 0.80], [0, 1]);

  const base: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage:    `url(${imageUrl})`,
    backgroundSize:     'cover',
    backgroundPosition: 'center',
  };

  return (
    <div
      className="relative"
      style={{ width: 'min(40vw, 260px)', height: 'min(53vw, 347px)' }}
    >
      {/* Layer 1 — base: always visible, desaturated + dark (underpainting) */}
      <div style={{ ...base, filter: 'grayscale(100%) brightness(0.55)' }} />

      {/* Layer 2 — builds colour and value */}
      <motion.div style={{ ...base, filter: 'grayscale(25%) brightness(0.85)', opacity: layer2Opacity }} />

      {/* Layer 3 — final full-colour layer */}
      <motion.div style={{ ...base, opacity: layer3Opacity }} />
    </div>
  );
}

function AssemblyScene({ artwork }: { artwork: Artwork }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progress   = useMotionValue(0);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const el = wrapperRef.current;
      if (el) {
        const rect        = el.getBoundingClientRect();
        const scrollableH = el.offsetHeight - window.innerHeight;
        if (scrollableH > 0) {
          progress.set(Math.max(0, Math.min(1, -rect.top / scrollableH)));
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [progress]);

  return (
    <div ref={wrapperRef} className="bg-art-charcoal" style={{ height: '320vh' }}>
      <div className="sticky top-0 bg-art-charcoal flex items-center justify-center" style={{ height: '100vh' }}>

        {/* Process text — left */}
        <div className="absolute left-8 md:left-14 top-1/2 -translate-y-1/2 w-[155px] md:w-[210px]">
          <p className="font-sans text-[9px] tracking-widest uppercase text-white/20 mb-8">The Process</p>
          <div className="relative h-36">
            {STAGES.map((stage, i) => (
              <StageText key={stage.label} index={i} stage={stage} progress={progress} />
            ))}
          </div>
        </div>

        {/* Layered painting — centre */}
        <LayeredPainting imageUrl={artwork.images[0]} progress={progress} />

        {/* Artwork info — right */}
        <ArtworkInfo artwork={artwork} progress={progress} />
      </div>
    </div>
  );
}

export function ArtworkAssembly() {
  const { artworks, loading } = useArtworks();
  const featured = artworks.find(a => a.availability === 'available') ?? artworks[0];

  if (loading || !featured) return null;

  return <AssemblyScene artwork={featured} />;
}
