import { InstagramIcon } from '../ui/Icons';
import { FadeIn } from '../ui/FadeIn';
import { useInstagramFeed } from '../../hooks/useInstagramFeed';

const PLACEHOLDERS = [
  'https://picsum.photos/seed/ig1/600/600',
  'https://picsum.photos/seed/ig2/600/600',
  'https://picsum.photos/seed/ig3/600/600',
  'https://picsum.photos/seed/ig4/600/600',
  'https://picsum.photos/seed/ig5/600/600',
  'https://picsum.photos/seed/ig6/600/600',
];

export function InstagramSection() {
  const { posts } = useInstagramFeed(6);

  const items = posts.length > 0
    ? posts.map(p => ({ src: p.media_url, href: p.permalink }))
    : PLACEHOLDERS.map(src => ({ src, href: 'https://www.instagram.com/the.fine.arc' }));

  return (
    <section className="py-20 md:py-32 px-6 md:px-12 lg:px-20 bg-art-white">
      <div className="max-w-8xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <a
              href="https://www.instagram.com/the.fine.arc"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow The Fine Arc on Instagram"
              className="inline-flex flex-col items-center gap-4 group"
            >
              <span className="flex items-center justify-center w-14 h-14 rounded-full border border-art-light text-art-charcoal transition-all duration-500 group-hover:border-art-charcoal group-hover:bg-art-charcoal group-hover:text-art-white">
                <InstagramIcon size={22} />
              </span>
              <span className="font-sans text-[11px] tracking-widest uppercase text-art-muted group-hover:text-art-charcoal transition-colors">
                Follow the Studio
              </span>
              <span className="font-serif text-xl font-light text-art-charcoal -mt-2">
                @the.fine.arc
              </span>
            </a>
          </div>
        </FadeIn>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 md:gap-2">
          {items.map((item, i) => (
            <FadeIn key={i} delay={i * 0.06}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden group"
              >
                <img
                  src={item.src}
                  alt={`Studio moment ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale-[20%] group-hover:grayscale-0"
                />
              </a>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
