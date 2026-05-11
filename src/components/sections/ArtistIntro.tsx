import { Link } from 'react-router-dom';
import { FadeIn } from '../ui/FadeIn';

export function ArtistIntro() {
  return (
    <section className="py-28 md:py-40 bg-cream-100">
      <div className="max-w-8xl mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {/* Image */}
          <FadeIn direction="left">
            <div className="relative">
              <div className="aspect-[4/3] sm:aspect-[4/5] overflow-hidden bg-cream-200">
                <img
                  src="https://picsum.photos/seed/artist-intro/800/1000"
                  alt="The artist at work"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 md:w-48 md:h-48 bg-cream-200 -z-10" />
            </div>
          </FadeIn>

          {/* Text */}
          <FadeIn direction="right" delay={0.2}>
            <div className="space-y-7 lg:max-w-lg">
              <p className="font-sans text-[10px] tracking-widest uppercase text-art-muted">
                The Artist
              </p>
              <h2 className="font-serif text-4xl md:text-5xl font-light text-art-charcoal leading-tight">
                Made slowly,
                <br />
                <em>with intention.</em>
              </h2>
              <div className="space-y-4 font-sans text-sm text-art-warm leading-relaxed">
                <p>
                  I make paintings and drawings that begin with long hours of looking — at light, at stillness, at the overlooked beauty of ordinary spaces.
                </p>
                <p>
                  Each work is a singular object. Not a series, not a reproduction. Something made once, to outlast the moment it came from.
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
