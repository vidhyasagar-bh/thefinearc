import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Artwork } from '../../types';
import { formatPrice } from '../../utils/format';

interface ArtworkCardProps {
  artwork: Artwork;
  index?: number;
}

const availabilityConfig = {
  available: { label: 'Available', className: 'text-art-warm' },
  sold: { label: 'Sold', className: 'text-art-muted line-through' },
  reserved: { label: 'Reserved', className: 'text-art-muted' },
};

export function ArtworkCard({ artwork, index = 0 }: ArtworkCardProps) {
  const config = availabilityConfig[artwork.availability];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/artwork/${artwork.id}`} className="group block">
        {/* Image */}
        <div className="relative overflow-hidden bg-cream-100 aspect-[3/4]">
          <img
            src={artwork.images[0]}
            alt={artwork.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          {artwork.availability === 'sold' && (
            <div className="absolute inset-0 bg-art-white/40 flex items-center justify-center">
              <span className="font-sans text-[10px] tracking-widest uppercase text-art-charcoal bg-art-white px-4 py-2">
                Sold
              </span>
            </div>
          )}
          {artwork.availability === 'reserved' && (
            <div className="absolute top-4 right-4">
              <span className="font-sans text-[9px] tracking-widest uppercase text-art-muted bg-art-white px-3 py-1.5">
                Reserved
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pt-4 pb-2 space-y-1.5">
          <h3 className="font-serif text-lg font-light text-art-charcoal leading-snug group-hover:text-art-warm transition-colors duration-300">
            {artwork.title}
          </h3>
          <p className="font-sans text-xs text-art-muted">{artwork.materials} · {artwork.dimensions}</p>
          <div className="flex items-center justify-between pt-1">
            <p className={`font-sans text-sm ${config.className}`}>
              {artwork.availability === 'sold' ? 'Sold' : formatPrice(artwork.price)}
            </p>
            <span className="font-sans text-[10px] tracking-widest uppercase text-art-light group-hover:text-art-muted transition-colors duration-300">
              View →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
