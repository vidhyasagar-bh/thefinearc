import { motion } from 'framer-motion';
import { InstagramIcon } from '../components/ui/Icons';

const HERO_IMAGE =
  'https://mvmuqynhqfzwvrfcwcwf.supabase.co/storage/v1/object/public/artwork-images/hero.png';

export function ComingSoonPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-art-charcoal">
      <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/75" />

      <div className="relative z-10 min-h-svh flex flex-col items-center justify-between px-6 py-10 md:py-14 text-center">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-serif text-lg md:text-xl font-light tracking-[0.25em] text-white/85"
        >
          The Fine Arc <span className="italic tracking-normal text-white/60">by Leela</span>
        </motion.p>

        <div className="max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.1] text-white"
          >
            Something beautiful
            <br />
            <em>is on its way.</em>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.9 }}
            className="mx-auto mt-8 mb-6 h-px w-12 bg-white/40"
          />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="font-sans text-sm md:text-base leading-relaxed text-white/75 max-w-md mx-auto"
          >
            The Fine Arc by Leela is being refreshed. Hand-painted mandalas and florals, made slowly and with intention, return very soon.
          </motion.p>
        </div>

        <motion.a
          href="https://www.instagram.com/the.fine.arc"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          className="inline-flex items-center gap-2.5 font-sans text-[11px] tracking-widest uppercase text-white/70 hover:text-white transition-colors group"
        >
          <span
            className="flex items-center justify-center w-6 h-6 rounded-[7px] text-white transition-transform duration-300 group-hover:scale-110"
            style={{
              background:
                'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)',
            }}
          >
            <InstagramIcon size={14} />
          </span>
          Follow the Studio
        </motion.a>
      </div>
    </div>
  );
}
