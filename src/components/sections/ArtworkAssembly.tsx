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

// Each layer after the base fades in at its own scroll window
function Layer({ src, index, total, progress }: {
  src: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  // Spread layers evenly across 0–0.85 of scroll progress
  const slot    = 0.85 / Math.max(total - 1, 1);
  const startAt = index === 0 ? 0 : (index - 1) * slot;
  const endAt   = startAt + slot * 0.6;

  const opacity = useTransform(
    progress,
    index === 0 ? [0, 0] : [startAt, endAt],
    index === 0 ? [1, 1] : [0, 1],
  );

  return (
    <motion.div
      style={{
        opacity,
        position: 'absolute',
        inset: 0,
        backgroundImage:    `url(${src})`,
        backgroundSize:     'cover',
        backgroundPosition: 'center',
      }}
    />
  );
}

function StageText({ index, total, stage, progress }: {
  index: number;
  total: number;
  stage: typeof STAGES[number];
  progress: MotionValue<number>;
}) {
  const slot    = 0.85 / Math.max(total - 1, 1);
  const s       = index === 0 ? 0    : (index - 1) * slot;
  const peak    = s + slot * 0.3;
  const e       = s + slot * 0.7;
  const fadeOut = index === total - 1 ? 1 : Math.min(e + slot * 0.2, 0.90);

  const opacity = useTransform(progress, [s, peak, e, fadeOut], [0, 1, 1, index === total - 1 ? 1 : 0]);
  const y       = useTransform(progress, [s, peak], [10, 0]);

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-0 flex flex-col justify-center">
      <p className="font-sans text-[9px] tracking-widest uppercase text-white/35 mb-3">{stage.label}</p>
      <p className="font-sans text-sm text-white/55 leading-relaxed">{stage.body}</p>
    </motion.div>
  );
}

function ArtworkInfo({ artwork, progress }: { artwork: Artwork; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.85, 0.97], [0, 1]);
  const y       = useTransform(progress, [0.85, 0.97], [14, 0]);
  return (
    <motion.div style={{ opacity, y }}
      className="absolute right-8 md:right-14 top-1/2 -translate-y-1/2 text-right w-[150px] md:w-[200px]">
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

function AssemblyScene({ artwork }: { artwork: Artwork }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progress   = useMotionValue(0);

  // Use all images from the artwork — each one is a stage of the painting
  const images = artwork.images.length >= 2 ? artwork.images : Array(4).fill(artwork.images[0]);

  // One scroll "slot" per stage, plus a hold at the end
  const scrollHeight = `${Math.max(images.length * 80 + 80, 300)}vh`;

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

  // Map image count to stage labels (pad or trim)
  const stageLabels = STAGES.slice(0, images.length);

  return (
    <div ref={wrapperRef} className="bg-art-charcoal" style={{ height: scrollHeight }}>
      <div className="sticky top-0 bg-art-charcoal flex items-center justify-center" style={{ height: '100vh' }}>

        {/* Stage text — left */}
        <div className="absolute left-8 md:left-14 top-1/2 -translate-y-1/2 w-[155px] md:w-[210px]">
          <p className="font-sans text-[9px] tracking-widest uppercase text-white/20 mb-8">The Process</p>
          <div className="relative h-36">
            {stageLabels.map((stage, i) => (
              <StageText key={stage.label} index={i} total={images.length} stage={stage} progress={progress} />
            ))}
          </div>
        </div>

        {/* Stacked painting layers — each image is a real stage photo */}
        <div
          className="relative"
          style={{ width: 'min(40vw, 260px)', height: 'min(53vw, 347px)' }}
        >
          {images.map((src, i) => (
            <Layer key={i} src={src} index={i} total={images.length} progress={progress} />
          ))}
        </div>

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
