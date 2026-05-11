import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function Hero() {
  return (
    <div className="relative h-screen min-h-[600px] overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://picsum.photos/seed/hero/2000/1200"
          alt="Featured artwork"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/65" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-16 md:pb-28 px-6 md:px-12 lg:px-20">
        <div className="max-w-8xl mx-auto w-full">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="font-sans text-[10px] tracking-widest uppercase text-white/60 mb-4"
          >
            Original Fine Art
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-[2.75rem] leading-[1.08] md:text-7xl lg:text-8xl font-light text-white max-w-2xl"
          >
            Art that stays
            <br />
            <em>with you.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            className="mt-5 font-sans text-sm text-white/55 max-w-xs md:max-w-sm leading-relaxed"
          >
            Each piece is a singular object, made slowly and with intention — to live in your home for a lifetime.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.95 }}
            className="mt-8 md:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
          >
            <Link
              to="/gallery"
              className="inline-flex items-center font-sans text-[11px] tracking-widest uppercase text-white border border-white/60 hover:border-white hover:bg-white hover:text-art-charcoal px-7 py-3.5 transition-all duration-500"
            >
              Explore Gallery
            </Link>
            <Link
              to="/about"
              className="font-sans text-[11px] tracking-widest uppercase text-white/55 hover:text-white transition-colors duration-300 border-b border-white/20 hover:border-white/50 pb-0.5"
            >
              About the Artist
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator — tighter, smaller */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.7 }}
        className="absolute bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5"
      >
        <span className="font-sans text-[8px] tracking-widest uppercase text-white/35">Scroll</span>
        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="w-px h-5 bg-white/25"
        />
      </motion.div>
    </div>
  );
}
