import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
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

function Tile({
  col, row, scatter, progress, imageUrl,
}: {
  col: number;
  row: number;
  scatter: { x: number; y: number; r: number };
  progress: MotionValue<number>;
  imageUrl: string;
}) {
  const idx = col + row * COLS;
  const startAt = (idx / (COLS * ROWS)) * 0.55;
  const endAt = startAt + 0.3;
  const fadeEnd = Math.min(startAt + 0.12, endAt);

  const x       = useTransform(progress, [startAt, endAt],  [scatter.x, 0]);
  const y       = useTransform(progress, [startAt, endAt],  [scatter.y, 0]);
  const rotate  = useTransform(progress, [startAt, endAt],  [scatter.r, 0]);
  const opacity = useTransform(progress, [startAt, fadeEnd],[0, 1]);

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

function AssemblyScene({ artwork }: { artwork: Artwork }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  });

  const sectionOpacity = useTransform(scrollYProgress, [0, 0.04], [0, 1]);
  const textOpacity    = useTransform(scrollYProgress, [0.72, 0.92], [0, 1]);
  const textY          = useTransform(scrollYProgress, [0.72, 0.92], [20, 0]);

  return (
    <div ref={wrapperRef} className="relative" style={{ height: '400vh' }}>
      <motion.div
        style={{ opacity: sectionOpacity }}
        className="sticky top-0 h-screen flex items-center justify-center overflow-hidden bg-art-charcoal"
      >
        {/* Label */}
        <p className="absolute top-8 left-8 md:top-12 md:left-14 font-sans text-[9px] tracking-widest uppercase text-white/25">
          Signature Work
        </p>

        {/* Tile grid */}
        <div
          className="relative"
          style={{ width: 'min(55vw, 300px)', aspectRatio: '3/4' }}
        >
          {SCATTER.map((scatter, i) => (
            <Tile
              key={i}
              col={i % COLS}
              row={Math.floor(i / COLS)}
              scatter={scatter}
              progress={scrollYProgress}
              imageUrl={artwork.images[0]}
            />
          ))}
        </div>

        {/* Text */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="absolute bottom-10 md:bottom-14 left-6 right-6 md:left-auto md:right-12 md:max-w-[240px] md:text-right"
        >
          <p className="font-sans text-[9px] tracking-widest uppercase text-white/35 mb-2">
            {[artwork.category, artwork.year].filter(Boolean).join(' · ')}
          </p>
          <h2 className="font-serif text-2xl md:text-3xl font-light text-white leading-tight mb-2">
            {artwork.title}
          </h2>
          {artwork.materials && (
            <p className="font-sans text-[11px] text-white/40 mb-5">{artwork.materials}</p>
          )}
          <div className="flex items-center gap-5 md:justify-end">
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
      </motion.div>
    </div>
  );
}

export function ArtworkAssembly() {
  const { artworks, loading } = useArtworks();
  const featured = artworks.find(a => a.availability === 'available') ?? artworks[0];

  if (loading || !featured) return null;

  return <AssemblyScene artwork={featured} />;
}
