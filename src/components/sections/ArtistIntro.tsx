import { Link } from 'react-router-dom';
import { FadeIn } from '../ui/FadeIn';

export function ArtistIntro() {
  return (
    <section className="py-28 md:py-40 bg-cream-100">
      <div className="max-w-8xl mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {/* Image */}
          <FadeIn direction="left">
            <div className="relative w-1/2 mx-auto scale-[1.3]">
              <div className="aspect-[891/1280] overflow-hidden bg-cream-200">
                <img
                  src="/HPArtist1.jpeg"
                  alt="The artist with her hand-painted mandala artworks"
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 md:w-48 md:h-48 bg-cream-200 -z-10 hidden sm:block" />
            </div>
          </FadeIn>

          {/* Text */}
          <FadeIn direction="right" delay={0.2}>
            <div className="space-y-7 lg:max-w-lg">
              <div className="space-y-4 font-sans text-sm text-art-warm leading-relaxed">
                <p>
                  Hi, I’m Leela, the heart behind The Fine Arc. I’m a New Jersey-based artist, a wife, and a mom to two wonderful girls who keep my days full of love, laughter, and a little chaos!
                </p>
                <p>
                  Outside of painting, I love cooking, baking, dancing, and enjoying the little moments with my family. One of my greatest joys is watching my girls develop their own love for art and creativity.
                </p>
                <p>
                  My artwork is inspired by nature, soft colors, and the beauty of little details. From intricate mandalas to delicate florals, I love exploring different styles and creating pieces that feel soft, timeless, and full of character.
                </p>
              </div>
              <Link
                to="/about"
                className="inline-block font-sans text-[11px] tracking-widest uppercase text-art-charcoal border-b border-art-charcoal hover:text-art-warm hover:border-art-warm pb-0.5 transition-colors duration-300 mt-4"
              >
                Read My Story
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
