import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useArtworks } from '../../hooks/useArtworks';
import { formatPrice } from '../../utils/format';
import type { Artwork } from '../../types';

const CHAPTERS = [
  {
    label: 'Observation',
    body: 'Every work begins long before the first mark — in hours of looking, sitting with a subject until it stops being an object.',
  },
  {
    label: 'First marks',
    body: 'The initial layer is always wrong. It is a necessary wrong — a commitment that forces every decision that follows.',
  },
  {
    label: 'Building',
    body: 'Colour, tone, texture. Each layer added slowly, often sanded back. The surface accumulates time.',
  },
  {
    label: 'Completion',
    body: 'A painting is finished not when nothing can be added, but when nothing needs to be.',
  },
];

// Each quadrant clips the same full image to one corner
const QUAD_CLIPS = [
  'inset(0 50% 50% 0)',  // top-left
  'inset(0 0 50% 50%)',  // top-right
  'inset(50% 50% 0 0)',  // bottom-left
  'inset(50% 0 0 50%)',  // bottom-right
] as const;

function AssemblyScene({ artwork }: { artwork: Artwork }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const imgUrl = artwork.images[0];

  // ── Fragment transforms: each quadrant flies in from its corner ──
  const q0x = useTransform(scrollYProgress, [0.00, 0.60], [-160, 0]);
  const q0y = useTransform(scrollYProgress, [0.00, 0.60], [-160, 0]);
  const q0o = useTransform(scrollYProgress, [0.00, 0.14], [0, 1]);

  const q1x = useTransform(scrollYProgress, [0.14, 0.68], [160, 0]);
  const q1y = useTransform(scrollYProgress, [0.14, 0.68], [-160, 0]);
  const q1o = useTransform(scrollYProgress, [0.14, 0.28], [0, 1]);

  const q2x = useTransform(scrollYProgress, [0.30, 0.76], [-160, 0]);
  const q2y = useTransform(scrollYProgress, [0.30, 0.76], [160, 0]);
  const q2o = useTransform(scrollYProgress, [0.30, 0.44], [0, 1]);

  const q3x = useTransform(scrollYProgress, [0.46, 0.84], [160, 0]);
  const q3y = useTransform(scrollYProgress, [0.46, 0.84], [160, 0]);
  const q3o = useTransform(scrollYProgress, [0.46, 0.60], [0, 1]);

  const quadXs = [q0x, q1x, q2x, q3x];
  const quadYs = [q0y, q1y, q2y, q3y];
  const quadOs = [q0o, q1o, q2o, q3o];

  // ── Chapter text: slides up on entry, up on exit ──
  const ch0o = useTransform(scrollYProgress, [0.00, 0.08, 0.22, 0.30], [0, 1, 1, 0]);
  const ch0y = useTransform(scrollYProgress, [0.00, 0.08, 0.22, 0.30], [24, 0, 0, -20]);

  const ch1o = useTransform(scrollYProgress, [0.22, 0.30, 0.44, 0.52], [0, 1, 1, 0]);
  const ch1y = useTransform(scrollYProgress, [0.22, 0.30, 0.44, 0.52], [24, 0, 0, -20]);

  const ch2o = useTransform(scrollYProgress, [0.44, 0.52, 0.64, 0.72], [0, 1, 1, 0]);
  const ch2y = useTransform(scrollYProgress, [0.44, 0.52, 0.64, 0.72], [24, 0, 0, -20]);

  const ch3o = useTransform(scrollYProgress, [0.64, 0.72, 1.00], [0, 1, 1]);
  const ch3y = useTransform(scrollYProgress, [0.64, 0.72, 1.00], [24, 0, 0]);

  const chOs = [ch0o, ch1o, ch2o, ch3o];
  const chYs = [ch0y, ch1y, ch2y, ch3y];

  // ── Reveal elements ──
  const glowO   = useTransform(scrollYProgress, [0.78, 1.00], [0, 1]);
  const infoO   = useTransform(scrollYProgress, [0.84, 0.97], [0, 1]);
  const infoY   = useTransform(scrollYProgress, [0.84, 0.97], [20, 0]);
  const hintO   = useTransform(scrollYProgress, [0.00, 0.07], [1, 0]);
  const lineScY = useTransform(scrollYProgress, [0.00, 1.00], [0, 1]);

  return (
    // Tall scroll container — sticky scene lives inside
    <div ref={containerRef} style={{ height: '400vh' }}>

      {/* Full-screen pinned scene */}
      <div className="sticky top-0 h-screen overflow-hidden bg-[#0e0e0e] flex items-center justify-center">

        {/* Scroll progress line — right edge */}
        <div className="absolute right-5 top-1/4 h-1/2 w-px bg-white/10">
          <motion.div
            style={{ scaleY: lineScY, transformOrigin: 'top', height: '100%', width: '100%' }}
            className="bg-white/25"
          />
        </div>

        {/* Chapter text — left panel (desktop only) */}
        <div className="absolute left-10 md:left-16 lg:left-20 top-1/2 -translate-y-1/2 w-44 hidden md:flex flex-col">
          <p className="font-sans text-[8px] tracking-[0.22em] uppercase text-white/20 mb-7">
            The Process
          </p>
          <div className="relative h-44">
            {CHAPTERS.map((ch, i) => (
              <motion.div
                key={i}
                style={{ opacity: chOs[i], y: chYs[i] }}
                className="absolute inset-0 flex flex-col justify-center"
              >
                <p className="font-sans text-[8px] tracking-[0.22em] uppercase text-white/30 mb-3">
                  {ch.label}
                </p>
                <p className="font-sans text-[13px] text-white/50 leading-relaxed">
                  {ch.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Artwork assembly — center */}
        <div
          className="relative shrink-0"
          style={{ width: 'min(55vw, 300px)', height: 'min(73vw, 400px)' }}
        >
          {/* Ambient glow on final reveal */}
          <motion.div
            style={{
              opacity: glowO,
              position: 'absolute',
              top: '-70px',
              right: '-70px',
              bottom: '-70px',
              left: '-70px',
              background: 'radial-gradient(ellipse at center, rgba(255,240,200,0.10) 0%, transparent 68%)',
              filter: 'blur(28px)',
              pointerEvents: 'none',
            }}
          />

          {/* 4 quadrant fragments — same image, clipped & offset */}
          {QUAD_CLIPS.map((clip, i) => (
            <motion.div
              key={i}
              style={{
                x: quadXs[i],
                y: quadYs[i],
                opacity: quadOs[i],
                position: 'absolute',
                inset: 0,
                clipPath: clip,
                backgroundImage: `url(${imgUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
        </div>

        {/* Artwork info — right panel (desktop only) */}
        <motion.div
          style={{ opacity: infoO, y: infoY }}
          className="absolute right-10 md:right-16 lg:right-20 top-1/2 -translate-y-1/2 w-44 text-right hidden md:block"
        >
          <p className="font-sans text-[8px] tracking-[0.22em] uppercase text-white/25 mb-3">
            {[artwork.category, artwork.year].filter(Boolean).join(' · ')}
          </p>
          <h2 className="font-serif text-xl font-light text-white leading-tight mb-2">
            {artwork.title}
          </h2>
          {artwork.materials && (
            <p className="font-sans text-[11px] text-white/35 mb-5">{artwork.materials}</p>
          )}
          <p className="font-serif text-base text-white/65 mb-5">{formatPrice(artwork.price)}</p>
          {artwork.availability === 'available' && (
            <Link
              to={`/artwork/${artwork.id}`}
              className="font-sans text-[9px] tracking-[0.2em] uppercase text-white/40 hover:text-white/75 border-b border-white/20 hover:border-white/50 pb-0.5 transition-colors duration-300"
            >
              View Work
            </Link>
          )}
        </motion.div>

        {/* Scroll hint — fades out after first scroll */}
        <motion.div
          style={{ opacity: hintO }}
          className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 pointer-events-none"
        >
          <p className="font-sans text-[8px] tracking-[0.25em] uppercase text-white/28">Scroll</p>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-7 bg-gradient-to-b from-white/25 to-transparent"
          />
        </motion.div>

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
