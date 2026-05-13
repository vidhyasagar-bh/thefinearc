import { useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useArtworks } from '../../hooks/useArtworks';
import { formatPrice } from '../../utils/format';
import type { Artwork } from '../../types';

const COLS = 3;
const ROWS = 4;

const SCATTER = [
  { x: -280, y: -180, r: -14 },
  { x:   90, y: -320, r:   9 },
  { x:  340, y: -160, r: -11 },
  { x: -380, y:  -40, r:  19 },
  { x: -130, y:  190, r: -23 },
  { x:  420, y:   90, r:  17 },
  { x: -230, y:  290, r:  -9 },
  { x:  180, y: -110, r:  28 },
  { x:  360, y:  260, r: -20 },
  { x: -350, y:  380, r:  14 },
  { x:  -70, y:  340, r: -16 },
  { x:  300, y:  400, r:  11 },
];

const STAGES = [
  { label: 'Observation', body: 'Every work begins long before the first mark — in hours of looking, sitting with a subject until it stops being an object.' },
  { label: 'First marks',  body: 'The initial layer is always wrong. It is a necessary wrong — a commitment that forces every decision that follows.' },
  { label: 'Building',     body: 'Colour, tone, texture. Each layer added slowly, often sanded back. The surface accumulates time.' },
  { label: 'Completion',   body: 'A painting is finished not when nothing can be added, but when nothing needs to be.' },
];

function Tile({ col, row, scatter, progress, imageUrl }: {
  col: number; row: number;
  scatter: { x: number; y: number; r: number };
  progress: MotionValue<number>;
  imageUrl: string;
}) {
  const idx     = col + row * COLS;
  const startAt = (idx / (COLS * ROWS)) * 0.55;
  const endAt   = startAt + 0.3;
  const fadeEnd = Math.min(startAt + 0.12, endAt);

  const x       = useTransform(progress, [startAt, endAt],  [scatter.x, 0]);
  const y       = useTransform(progress, [startAt, endAt],  [scatter.y, 0]);
  const rotate  = useTransform(progress, [startAt, endAt],  [scatter.r, 0]);
  const opacity = useTransform(progress, [0, startAt, fadeEnd], [0.2, 0.2, 1]);

  const bgX = COLS > 1 ? (col / (COLS - 1)) * 100 : 0;
  const bgY = ROWS > 1 ? (row / (ROWS - 1)) * 100 : 0;

  return (
    <motion.div
      style={{
        x, y, rotate, opacity,
        position: 'absolute',
        left:   `${(col / COLS) * 100}%`,
        top:    `${(row / ROWS) * 100}%`,
        width:  `${100 / COLS}%`,
        height: `${100 / ROWS}%`,
        backgroundImage:    `url(${imageUrl})`,
        backgroundSize:     `${COLS * 100}% ${ROWS * 100}%`,
        backgroundPosition: `${bgX}% ${bgY}%`,
      }}
    />
  );
}

function StageText({ index, stage, progress }: {
  index: number;
  stage: typeof STAGES[number];
  progress: MotionValue<number>;
}) {
  const s       = index * 0.20;
  const peak    = s + 0.10;
  const e       = s + 0.18;
  const fadeOut = Math.min(e + 0.06, 0.78);

  const opacity = useTransform(progress, [s, peak, e, fadeOut], [0, 1, 1, 0]);
  const y       = useTransform(progress, [s, peak], [12, 0]);

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-0 flex flex-col justify-center">
      <p className="font-sans text-[9px] tracking-widest uppercase text-white/35 mb-3">{stage.label}</p>
      <p className="font-sans text-sm text-white/55 leading-relaxed">{stage.body}</p>
    </motion.div>
  );
}

function ArtworkInfo({ artwork, progress }: { artwork: Artwork; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.80, 0.95], [0, 1]);
  const y       = useTransform(progress, [0.80, 0.95], [16, 0]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute right-8 md:right-14 top-1/2 -translate-y-1/2 text-right w-[150px] md:w-[200px]"
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
      <div className="flex items-center justify-end gap-4">
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
  );
}

function AssemblyScene({ artwork }: { artwork: Artwork }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Raw motion value — updated directly on scroll, no React re-renders
  const progress = useMotionValue(0);

  useEffect(() => {
    // rAF loop: reads rect every frame so progress is always accurate
    // regardless of which element is the scroll container
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
    <div ref={wrapperRef} className="relative bg-art-charcoal" style={{ height: '350vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-art-charcoal flex items-center justify-center">

        {/* Process text — left */}
        <div className="absolute left-8 md:left-14 top-1/2 -translate-y-1/2 w-[155px] md:w-[210px]">
          <p className="font-sans text-[9px] tracking-widest uppercase text-white/20 mb-8">The Process</p>
          <div className="relative h-36">
            {STAGES.map((stage, i) => (
              <StageText key={stage.label} index={i} stage={stage} progress={progress} />
            ))}
          </div>
        </div>

        {/* Tile grid — centre */}
        <div className="relative" style={{ width: 'min(42vw, 260px)', aspectRatio: '3/4' }}>
          {SCATTER.map((scatter, i) => (
            <Tile
              key={i}
              col={i % COLS}
              row={Math.floor(i / COLS)}
              scatter={scatter}
              progress={progress}
              imageUrl={artwork.images[0]}
            />
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
