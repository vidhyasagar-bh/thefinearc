import type { Artwork } from '../../types';
import { ArtworkCard } from './ArtworkCard';

interface ArtworkGridProps {
  artworks: Artwork[];
}

export function ArtworkGrid({ artworks }: ArtworkGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
      {artworks.map((artwork, i) => (
        <ArtworkCard key={artwork.id} artwork={artwork} index={i} />
      ))}
    </div>
  );
}
