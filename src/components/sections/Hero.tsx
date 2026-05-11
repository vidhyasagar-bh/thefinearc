import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function Hero() {
  return (
    <div className="relative h-screen min-h-[700px] overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://picsum.photos/seed/hero/2000/1200"
          alt="Featured artwork"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-20 md:pb-28 px-6 md:px-12 lg:px-20">
        <div className="max-w-8xl mx-auto w-full">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="font-sans text-[10px] tracking-widest uppercase text-white/70 mb-5"
          >
            Original Fine Art
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-5xl md:text-7xl lg:text-8xl font-light text-white leading-[1.05] max-w-3xl"
          >
            Art that stays
            <br />
            <em>with you.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-6 font-sans text-sm text-white/60 max-w-sm leading-relaxed"
          >
            Each piece is a singular object, made slowly and with intention — to live in your home for a lifetime.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-10 flex items-center gap-6"
          >
            <Link
              to="/gallery"
              className="inline-flex items-center gap-3 font-sans text-[11px] tracking-widest uppercase text-white border border-white/60 hover:border-white hover:bg-white hover:text-art-charcoal px-8 py-4 transition-all duration-500"
            >
              Explore Gallery
            </Link>
            <Link
              to="/about"
              className="font-sans text-[11px] tracking-widest uppercase text-white/60 hover:text-white transition-colors duration-300 border-b border-white/20 hover:border-white/60 pb-0.5"
            >
              About the Artist
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="font-sans text-[9px] tracking-widest uppercase text-white/40">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-px h-8 bg-white/30"
        />
      </motion.div>
    </div>
  );
}
