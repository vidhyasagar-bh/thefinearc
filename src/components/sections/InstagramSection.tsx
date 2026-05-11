import { InstagramIcon } from '../ui/Icons';
import { FadeIn } from '../ui/FadeIn';

const instagramPosts = [
  'https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=600&q=80',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80',
  'https://images.unsplash.com/photo-1549887534-1541e9326642?w=600&q=80',
  'https://images.unsplash.com/photo-1515405295579-ba7b45403062?w=600&q=80',
  'https://images.unsplash.com/photo-1609767199556-f53e18e58f0e?w=600&q=80',
  'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=600&q=80',
];

export function InstagramSection() {
  return (
    <section className="py-20 md:py-32 px-6 md:px-12 lg:px-20 bg-art-white">
      <div className="max-w-8xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-sans text-[11px] tracking-widest uppercase text-art-muted hover:text-art-charcoal transition-colors group"
            >
              <InstagramIcon size={14} />
              Follow the Studio
            </a>
          </div>
        </FadeIn>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 md:gap-2">
          {instagramPosts.map((src, i) => (
            <FadeIn key={i} delay={i * 0.06}>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden group"
              >
                <img
                  src={src}
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
